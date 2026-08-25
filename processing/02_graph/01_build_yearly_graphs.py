"""
Script de Modelagem e Processamento de Grafos Anuais (GeoFlight-BR)
Caminho: processing/02_graph/01_build_yearly_graphs.py

Responsabilidades:
1. Carregar os datasets unificados (voos e metadados de aeroportos).
2. Construir grafos anuais dirigidos e não-dirigidos com NetworkX para cada ano t in [2000, 2026].
3. Filtrar self-loops (voos com origem == destino) para visualização consistente em arcos Deck.gl.
4. Computar métricas topológicas por nó:
   - In-degree, out-degree e total degree
   - Centralidade de Intermediação (Betweenness Centrality) normalizada em [0, 1]
   - Força ponderada do nó (Node Strength: volume total de voos/decolagens)
   - Top destinos diretos por volume de voo
5. Computar atributos por aresta:
   - Distância geodésica em km (fórmula de Haversine)
   - Volume anual de voos e passageiros estimados
6. Identificar lacunas de conectividade regional ("Desertos de Rota"):
   - Analisar todos os pares de capitais brasileiras sem conexão direta
   - Calcular o caminho mais curto (Shortest Path) por saltos e por distância geodésica acumulada
   - Calcular o desvio de rota (Detour Ratio) em relação à distância direta
7. Salvar os resultados intermediários processados em Parquet/JSON para consumo pelo exportador.
"""

import os
import sys
import math
import json
import time
from typing import Dict, List, Tuple, Any, Optional
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
import pyarrow.compute as pc
import networkx as nx

# Força codificação UTF-8 no console Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


# Definição das 27 capitais brasileiras (26 estados + Distrito Federal)
BRAZILIAN_CAPITALS = [
    {"state": "AC", "city": "Rio Branco", "icaos": ["SBRB"]},
    {"state": "AL", "city": "Maceió", "icaos": ["SBMO"]},
    {"state": "AP", "city": "Macapá", "icaos": ["SBMQ"]},
    {"state": "AM", "city": "Manaus", "icaos": ["SBEG"]},
    {"state": "BA", "city": "Salvador", "icaos": ["SBSV"]},
    {"state": "CE", "city": "Fortaleza", "icaos": ["SBFZ"]},
    {"state": "DF", "city": "Brasília", "icaos": ["SBBR"]},
    {"state": "ES", "city": "Vitória", "icaos": ["SBVT"]},
    {"state": "GO", "city": "Goiânia", "icaos": ["SBGO"]},
    {"state": "MA", "city": "São Luís", "icaos": ["SBSL"]},
    {"state": "MT", "city": "Cuiabá", "icaos": ["SBCY"]},
    {"state": "MS", "city": "Campo Grande", "icaos": ["SBCG"]},
    {"state": "MG", "city": "Belo Horizonte", "icaos": ["SBCF", "SBBH"]},
    {"state": "PA", "city": "Belém", "icaos": ["SBBE"]},
    {"state": "PB", "city": "João Pessoa", "icaos": ["SBJP"]},
    {"state": "PR", "city": "Curitiba", "icaos": ["SBCT"]},
    {"state": "PE", "city": "Recife", "icaos": ["SBRF"]},
    {"state": "PI", "city": "Teresina", "icaos": ["SBTE"]},
    {"state": "RJ", "city": "Rio de Janeiro", "icaos": ["SBRJ", "SBGL"]},
    {"state": "RN", "city": "Natal", "icaos": ["SBSG", "SBNT"]},
    {"state": "RS", "city": "Porto Alegre", "icaos": ["SBPA"]},
    {"state": "RO", "city": "Porto Velho", "icaos": ["SBPV"]},
    {"state": "RR", "city": "Boa Vista", "icaos": ["SBBV"]},
    {"state": "SC", "city": "Florianópolis", "icaos": ["SBFL"]},
    {"state": "SP", "city": "São Paulo", "icaos": ["SBGR", "SBSP", "SBKP"]},
    {"state": "SE", "city": "Aracaju", "icaos": ["SBAR"]},
    {"state": "TO", "city": "Palmas", "icaos": ["SBPJ"]},
]


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calcula a distância geodésica em quilômetros entre dois pontos de coordenadas
    geográficas através da fórmula de Haversine (Great Circle Distance).
    """
    R = 6371.0088  # Raio médio da Terra em km (WGS-84)
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def load_airport_metadata(airports_parquet: str, airports_json: str) -> Dict[str, Dict[str, Any]]:
    """
    Carrega e consolida os metadados dos aeroportos combinando a base filtrada
    e o JSON mestre de aeroportos.
    """
    print("-> Carregando base de metadados de aeroportos...", flush=True)
    
    json_data = {}
    if os.path.exists(airports_json):
        with open(airports_json, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
            
    df_airports = pd.read_parquet(airports_parquet)
    
    airports_map = {}
    for _, row in df_airports.iterrows():
        icao = str(row['icao']).strip().upper()
        extra = json_data.get(icao, {})
        
        iata = str(extra.get('iata', '')).strip().upper()
        if iata in ('NONE', 'NAN', 'NULL') or not iata:
            iata = ''
            
        elevation = extra.get('elevation', 0)
        if elevation is None or pd.isna(elevation):
            elevation = 0
        else:
            try:
                elevation = int(elevation)
            except (ValueError, TypeError):
                elevation = 0

        tz = extra.get('tz', 'America/Sao_Paulo')
        if not tz or pd.isna(tz):
            tz = 'America/Sao_Paulo'
            
        airports_map[icao] = {
            'icao': icao,
            'iata': iata,
            'name': str(row.get('name', extra.get('name', ''))).strip(),
            'city': str(row.get('city', extra.get('city', ''))).strip(),
            'state': str(row.get('state', extra.get('state', ''))).strip(),
            'country': str(row.get('country', extra.get('country', 'BR'))).strip(),
            'lat': float(row['lat']),
            'lon': float(row['lon']),
            'elevation': elevation,
            'tz': str(tz)
        }
        
    print(f"   Total de aeroportos indexados: {len(airports_map)}", flush=True)
    return airports_map


def load_and_aggregate_flights(vra_parquet: str) -> pd.DataFrame:
    """
    Carrega o dataset unificado de voos da ANAC com PyArrow e agrega os volumes
    por ano, aeroporto de origem e aeroporto de destino.
    Remove self-loops (origem == destino).
    """
    print("-> Carregando registros de voos da ANAC com PyArrow...", flush=True)
    t0 = time.time()
    
    schema = pq.read_schema(vra_parquet)
    
    # Identifica colunas pelo nome ou índice
    col_names = schema.names
    col_orig = None
    col_dest = None
    
    for name in col_names:
        if 'origem' in name.lower():
            col_orig = name
        elif 'destino' in name.lower():
            col_dest = name
            
    if not col_orig or not col_dest:
        col_orig = col_names[4]
        col_dest = col_names[5]
        
    col_ref = 'Referencia_Ano_Mes'
    
    table = pq.read_table(vra_parquet, columns=[col_orig, col_dest, col_ref])
    total_raw_flights = len(table)
    print(f"   {total_raw_flights:,} voos carregados em {time.time() - t0:.2f}s", flush=True)
    
    # Extração de ano vetorizada via PyArrow Compute
    year_col = pc.cast(pc.utf8_slice_codeunits(table[col_ref], 0, 4), pa.int32())
    table = table.append_column('year', year_col)
    
    # Conversão enxuta para DataFrame
    df = table.select([col_orig, col_dest, 'year']).to_pandas()
    df.columns = ['orig', 'dest', 'year']
    
    # Limpeza básica e remoção de voos locais em circuito fechado (self-loops)
    df['orig'] = df['orig'].astype(str).str.strip().str.upper()
    df['dest'] = df['dest'].astype(str).str.strip().str.upper()
    df = df[df['orig'] != df['dest']]
    
    # Agregação anual de rotas
    print("-> Agregando volumes por rota e ano...", flush=True)
    t1 = time.time()
    routes_agg = df.groupby(['year', 'orig', 'dest'], as_index=False).size()
    routes_agg.rename(columns={'size': 'flights'}, inplace=True)
    
    # Estimação consistente de passageiros (média estimada de 115 pax por voo comercial)
    routes_agg['pax'] = (routes_agg['flights'] * 115).astype(int)
    
    print(f"   {len(routes_agg):,} rotas agregadas em {time.time() - t1:.2f}s", flush=True)
    return routes_agg


def build_yearly_graph_analysis(
    routes_df: pd.DataFrame,
    airports_map: Dict[str, Dict[str, Any]]
) -> Tuple[Dict[int, Dict[str, Any]], pd.DataFrame, pd.DataFrame]:
    """
    Executa a análise topológica de grafos ano a ano:
    - Constrói grafos dirigidos e não-dirigidos
    - Computa centralidade de intermediação, graus e força por nó
    - Detecta lacunas de conectividade para todas as capitais brasileiras
    """
    print("\n-> Iniciando modelagem e análise de grafos ano a ano (2000-2026)...", flush=True)
    
    years = sorted(routes_df['year'].unique())
    yearly_results = {}
    
    all_node_metrics_list = []
    all_routes_enriched_list = []
    
    # Pré-computação de distâncias geodésicas para rotas
    print("   Computando distâncias geodésicas (Haversine)...", flush=True)
    dist_cache: Dict[Tuple[str, str], float] = {}
    
    for year in years:
        t_year_start = time.time()
        df_year = routes_df[routes_df['year'] == year].copy()
        
        # 1. Criação dos grafos NetworkX
        G_dir = nx.DiGraph()
        G_undir = nx.Graph()
        
        # Adiciona nós com metadados espaciais
        active_icaos = set(df_year['orig']).union(set(df_year['dest']))
        for icao in active_icaos:
            if icao in airports_map:
                meta = airports_map[icao]
                G_dir.add_node(icao, **meta)
                G_undir.add_node(icao, **meta)
                
        # Adiciona arestas
        for _, row in df_year.iterrows():
            u = row['orig']
            v = row['dest']
            fl = int(row['flights'])
            px = int(row['pax'])
            
            if u not in airports_map or v not in airports_map:
                continue
                
            pair_key = (u, v) if u <= v else (v, u)
            if pair_key not in dist_cache:
                lat1, lon1 = airports_map[u]['lat'], airports_map[u]['lon']
                lat2, lon2 = airports_map[v]['lat'], airports_map[v]['lon']
                dist_cache[pair_key] = haversine_distance(lat1, lon1, lat2, lon2)
            dist_km = dist_cache[pair_key]
            
            # Grafo Direcionado
            G_dir.add_edge(u, v, flights=fl, pax=px, dist_km=dist_km, weight=dist_km)
            
            # Grafo Não-Direcionado (Consolidado)
            if G_undir.has_edge(u, v):
                G_undir[u][v]['flights'] += fl
                G_undir[u][v]['pax'] += px
            else:
                G_undir.add_edge(u, v, flights=fl, pax=px, dist_km=dist_km, weight=dist_km)
                
            all_routes_enriched_list.append({
                'year': int(year),
                'orig': u,
                'dest': v,
                'flights': fl,
                'pax': px,
                'dist_km': dist_km
            })

        # 2. Computação de Métricas por Nó
        # Centralidade de Intermediação (Betweenness)
        betweenness = nx.betweenness_centrality(G_undir, normalized=True, weight=None)
        max_bet = max(betweenness.values()) if betweenness and max(betweenness.values()) > 0 else 1.0
        
        # Grau e Força
        node_metrics_year = {}
        for icao in G_dir.nodes():
            in_deg = G_dir.in_degree(icao)
            out_deg = G_dir.out_degree(icao)
            tot_deg = G_undir.degree(icao)
            
            in_fl = sum(d['flights'] for _, _, d in G_dir.in_edges(icao, data=True))
            out_fl = sum(d['flights'] for _, _, d in G_dir.out_edges(icao, data=True))
            tot_fl = in_fl + out_fl
            
            bet_val = float(betweenness.get(icao, 0.0))
            bet_norm = float(bet_val / max_bet) if max_bet > 0 else 0.0
            
            # Top destinos diretos a partir deste nó
            out_destinations = [
                {'dest': target, 'flights': int(d['flights']), 'dist_km': float(d['dist_km'])}
                for _, target, d in G_dir.out_edges(icao, data=True)
            ]
            out_destinations.sort(key=lambda x: x['flights'], reverse=True)
            top_dest = out_destinations[:10]
            
            metric_entry = {
                'year': int(year),
                'icao': icao,
                'in_degree': int(in_deg),
                'out_degree': int(out_deg),
                'degree': int(tot_deg),
                'in_flights': int(in_fl),
                'out_flights': int(out_fl),
                'strength': int(tot_fl),
                'betweenness': round(bet_val, 6),
                'betweenness_norm': round(bet_norm, 6),
                'top_destinations': top_dest
            }
            node_metrics_year[icao] = metric_entry
            all_node_metrics_list.append(metric_entry)

        # 3. Análise de Lacunas de Conectividade entre Capitais
        # Determina o aeroporto ativo principal de cada capital no ano em questão
        cap_active_map = {}
        for cap in BRAZILIAN_CAPITALS:
            best_icao = None
            best_volume = -1
            for cand_icao in cap['icaos']:
                if cand_icao in G_undir:
                    vol = node_metrics_year.get(cand_icao, {}).get('strength', 0)
                    if vol > best_volume:
                        best_volume = vol
                        best_icao = cand_icao
            if best_icao:
                cap_active_map[cap['state']] = {
                    'state': cap['state'],
                    'city': cap['city'],
                    'icao': best_icao
                }
                
        # Análise par a par de todas as capitais ativas
        capital_gaps = []
        cap_states = sorted(list(cap_active_map.keys()))
        
        for i in range(len(cap_states)):
            for j in range(i + 1, len(cap_states)):
                st_a = cap_states[i]
                st_b = cap_states[j]
                cap_a = cap_active_map[st_a]
                cap_b = cap_active_map[st_b]
                u = cap_a['icao']
                v = cap_b['icao']
                
                # Distância geodésica direta
                pair_k = (u, v) if u <= v else (v, u)
                if pair_k not in dist_cache:
                    lat1, lon1 = airports_map[u]['lat'], airports_map[u]['lon']
                    lat2, lon2 = airports_map[v]['lat'], airports_map[v]['lon']
                    dist_cache[pair_k] = haversine_distance(lat1, lon1, lat2, lon2)
                direct_dist = dist_cache[pair_k]
                
                has_direct = G_undir.has_edge(u, v)
                
                gap_info = {
                    'orig_state': st_a,
                    'orig_city': cap_a['city'],
                    'orig_icao': u,
                    'dest_state': st_b,
                    'dest_city': cap_b['city'],
                    'dest_icao': v,
                    'direct': bool(has_direct),
                    'direct_dist_km': direct_dist,
                    'path': [u, v] if has_direct else [],
                    'path_cities': [cap_a['city'], cap_b['city']] if has_direct else [],
                    'stops': 0 if has_direct else None,
                    'hops': 1 if has_direct else None,
                    'path_dist_km': direct_dist if has_direct else None,
                    'detour_ratio': 1.0 if has_direct else None,
                    'connected': True
                }
                
                if not has_direct:
                    # Verifica conectividade no grafo
                    if nx.has_path(G_undir, u, v):
                        # Shortest path ponderado pela distância física em km
                        shortest_path = nx.shortest_path(G_undir, source=u, target=v, weight='weight')
                        
                        # Computa a distância real acumulada com conexões
                        accum_dist = 0.0
                        for step_idx in range(len(shortest_path) - 1):
                            n1 = shortest_path[step_idx]
                            n2 = shortest_path[step_idx + 1]
                            step_k = (n1, n2) if n1 <= n2 else (n2, n1)
                            accum_dist += dist_cache.get(step_k, 0.0)
                            
                        accum_dist = round(accum_dist, 2)
                        detour = round(accum_dist / direct_dist, 3) if direct_dist > 0 else 1.0
                        path_cities = [airports_map.get(node, {}).get('city', node) for node in shortest_path]
                        
                        gap_info['path'] = shortest_path
                        gap_info['path_cities'] = path_cities
                        gap_info['stops'] = len(shortest_path) - 2
                        gap_info['hops'] = len(shortest_path) - 1
                        gap_info['path_dist_km'] = accum_dist
                        gap_info['detour_ratio'] = detour
                    else:
                        gap_info['connected'] = False
                        
                capital_gaps.append(gap_info)
                
        # Resumo do ano
        num_disconnected = sum(1 for g in capital_gaps if not g['direct'])
        total_pairs = len(capital_gaps)
        disc_pct = round((num_disconnected / total_pairs) * 100, 1) if total_pairs > 0 else 0
        
        yearly_results[int(year)] = {
            'year': int(year),
            'nodes_count': G_undir.number_of_nodes(),
            'edges_count': G_undir.number_of_edges(),
            'total_flights': int(df_year['flights'].sum()),
            'capitals_active': len(cap_active_map),
            'capital_pairs_total': total_pairs,
            'capital_pairs_disconnected': num_disconnected,
            'capital_gap_percentage': disc_pct,
            'connectivity_gaps': capital_gaps,
            'node_metrics': node_metrics_year
        }
        
        print(f"   [Ano {year}] {G_undir.number_of_nodes()} aeroportos, {G_undir.number_of_edges()} rotas, {num_disconnected}/{total_pairs} pares de capitais sem voo direto ({disc_pct}%) - ({time.time() - t_year_start:.2f}s)", flush=True)
        
    df_node_metrics = pd.DataFrame(all_node_metrics_list)
    df_enriched_routes = pd.DataFrame(all_routes_enriched_list)
    
    return yearly_results, df_node_metrics, df_enriched_routes


def main():
    """
    Ponto de entrada principal do pipeline de grafos.
    """
    print("================================================================================")
    print("  GeoFlight-BR: Pipeline de Modelagem de Grafos e Análise Topológica (2000-2026)")
    print("================================================================================")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    vra_parquet = os.path.join(base_dir, "static", "parquets", "vra_final_unified.parquet")
    airports_parquet = os.path.join(base_dir, "static", "parquets", "airports_filtered.parquet")
    airports_json = os.path.join(base_dir, "data", "aeroportos", "airports.json")
    
    out_graph_dir = os.path.join(base_dir, "processing", "02_graph")
    os.makedirs(out_graph_dir, exist_ok=True)
    
    # 1. Carregamento dos Metadados
    airports_map = load_airport_metadata(airports_parquet, airports_json)
    
    # 2. Agregação dos Voos (com remoção de self-loops)
    routes_df = load_and_aggregate_flights(vra_parquet)
    
    # 3. Modelagem e Análise de Grafos
    yearly_results, df_node_metrics, df_routes = build_yearly_graph_analysis(routes_df, airports_map)
    
    # 4. Salvamento de Datasets Intermediários em Parquet
    print("\n-> Salvando datasets de grafos processados...", flush=True)
    node_metrics_out = os.path.join(base_dir, "static", "parquets", "yearly_node_metrics.parquet")
    routes_out = os.path.join(base_dir, "static", "parquets", "yearly_routes.parquet")
    
    # Remove colunas de listas complexas antes de salvar no Parquet tabular
    df_node_metrics_clean = df_node_metrics.drop(columns=['top_destinations'], errors='ignore')
    df_node_metrics_clean.to_parquet(node_metrics_out, index=False)
    print(f"   Salvo: {node_metrics_out} ({len(df_node_metrics_clean):,} registros)", flush=True)
    
    df_routes.to_parquet(routes_out, index=False)
    print(f"   Salvo: {routes_out} ({len(df_routes):,} registros)", flush=True)
    
    # Salva cache dos resultados em JSON intermediário para o exportador
    cache_json_path = os.path.join(out_graph_dir, "yearly_graph_cache.json")
    print(f"   Gravando cache intermediário em {cache_json_path}...", flush=True)
    with open(cache_json_path, 'w', encoding='utf-8') as f:
        json.dump(yearly_results, f, ensure_ascii=False)
        
    print("\n[OK] Modelagem de Grafos concluída com sucesso!", flush=True)


if __name__ == "__main__":
    main()
