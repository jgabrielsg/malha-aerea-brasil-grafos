"""
Script de Exportação de Payloads para o Front-end (GeoFlight-BR)
Caminho: processing/03_final_parquet/01_export_frontend_payloads.py

Responsabilidades:
1. Carregar os dados de grafos e métricas processados da etapa 02_graph.
2. Gerar e exportar os arquivos JSON compactos, normalizados e otimizados:
   - airports_meta.json: Cadastro unificado de aeroportos com coordenadas, dados cadastrais
     e séries temporais de métricas de centralidade (grau, betweenness, força, top destinos).
   - routes_by_year.json: Dicionário indexado por ano (2000 a 2026) contendo todas as rotas
     (orig, dest, flights, pax, dist_km) para consumo instantâneo pelo ArcLayer do Deck.gl.
   - connectivity_gaps.json (e structural_holes.json): Mapeamento ano a ano dos pares de capitais
     sem voo direto ("Desertos de Rota"), contendo o menor caminho por conexões (shortest path),
     distância direta vs distância com escalas e desvio relativo.
3. Salvar os arquivos em public/data/ e static/data/.
"""

import os
import sys
import json
import time
from typing import Dict, List, Any
import pandas as pd

# Força codificação UTF-8 no console Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass


# Definição das 27 capitais brasileiras
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


def clean_nan_and_inf(obj: Any) -> Any:
    """
    Função recursiva para sanitizar dados, garantindo que nenhum NaN, Inf ou -Inf
    chegue aos arquivos JSON finais (compatibilidade estrita com JSON specification).
    """
    if isinstance(obj, float):
        if pd.isna(obj) or obj != obj:
            return None
        if obj == float('inf') or obj == float('-inf'):
            return None
        return obj
    elif isinstance(obj, dict):
        return {k: clean_nan_and_inf(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_and_inf(item) for item in obj]
    return obj


def export_frontend_payloads(
    cache_json_path: str,
    airports_parquet: str,
    airports_json: str,
    routes_parquet: str,
    output_dirs: List[str]
):
    """
    Consolida e exporta os 3 arquivos JSON principais para os diretórios de saída especificados.
    """
    print("-> Iniciando exportação de payloads otimizados para o front-end...", flush=True)
    t0 = time.time()
    
    # 1. Carrega Metadados Mestres dos Aeroportos
    print("   Carregando metadados cadastrais dos aeroportos...", flush=True)
    json_meta = {}
    if os.path.exists(airports_json):
        with open(airports_json, 'r', encoding='utf-8') as f:
            json_meta = json.load(f)
            
    df_airports = pd.read_parquet(airports_parquet)
    airports_master = {}
    for _, row in df_airports.iterrows():
        icao = str(row['icao']).strip().upper()
        extra = json_meta.get(icao, {})
        
        iata = str(extra.get('iata', '')).strip().upper()
        if iata in ('NONE', 'NAN', 'NULL') or not iata:
            iata = ''
            
        elevation = extra.get('elevation', 0)
        try:
            elevation = int(elevation) if elevation is not None and not pd.isna(elevation) else 0
        except (ValueError, TypeError):
            elevation = 0

        tz = extra.get('tz', 'America/Sao_Paulo')
        if not tz or pd.isna(tz):
            tz = 'America/Sao_Paulo'
            
        airports_master[icao] = {
            'icao': icao,
            'iata': iata,
            'name': str(row.get('name', extra.get('name', ''))).strip(),
            'city': str(row.get('city', extra.get('city', ''))).strip(),
            'state': str(row.get('state', extra.get('state', ''))).strip(),
            'country': str(row.get('country', extra.get('country', 'BR'))).strip(),
            'lat': round(float(row['lat']), 6),
            'lon': round(float(row['lon']), 6),
            'elevation': elevation,
            'tz': str(tz),
            'is_capital': False,
            'capital_city': None,
            'yearly': {},
            'summary': {
                'total_flights': 0,
                'years_active': 0,
                'max_degree': 0,
                'max_betweenness': 0.0
            }
        }

    # 2. Carrega Dados de Grafos Processados
    print("   Carregando resultados da modelagem de grafos...", flush=True)
    with open(cache_json_path, 'r', encoding='utf-8') as f:
        yearly_graph_data = json.load(f)
        
    # Mapeamento de Capitais para flag is_capital
    cap_icao_to_city = {}
    for cap in BRAZILIAN_CAPITALS:
        for icao in cap['icaos']:
            cap_icao_to_city[icao] = cap['city']

    # 3. Construção do Payload: airports_meta.json
    print("   Processando séries temporais de centralidade para airports_meta.json...", flush=True)
    for year_str, data in yearly_graph_data.items():
        year = int(year_str)
        node_metrics = data.get('node_metrics', {})
        
        for icao, metrics in node_metrics.items():
            if icao not in airports_master:
                continue
                
            air = airports_master[icao]
            air['yearly'][str(year)] = {
                'in_degree': metrics.get('in_degree', 0),
                'out_degree': metrics.get('out_degree', 0),
                'degree': metrics.get('degree', 0),
                'in_flights': metrics.get('in_flights', 0),
                'out_flights': metrics.get('out_flights', 0),
                'strength': metrics.get('strength', 0),
                'betweenness': metrics.get('betweenness', 0.0),
                'betweenness_norm': metrics.get('betweenness_norm', 0.0),
                'top_destinations': metrics.get('top_destinations', [])
            }
            
            # Atualiza resumo global do aeroporto
            air['summary']['total_flights'] += metrics.get('strength', 0)
            air['summary']['years_active'] += 1
            if metrics.get('degree', 0) > air['summary']['max_degree']:
                air['summary']['max_degree'] = metrics.get('degree', 0)
            if metrics.get('betweenness', 0.0) > air['summary']['max_betweenness']:
                air['summary']['max_betweenness'] = metrics.get('betweenness', 0.0)

    # Aplica flags de capital
    for icao, air in airports_master.items():
        if icao in cap_icao_to_city:
            air['is_capital'] = True
            air['capital_city'] = cap_icao_to_city[icao]
            
    # Formata airports_meta como payload estruturado
    airports_payload = {
        'total_airports': len(airports_master),
        'airports': airports_master
    }
    airports_payload = clean_nan_and_inf(airports_payload)

    # 4. Construção do Payload: routes_by_year.json
    print("   Processando matriz de rotas anuais para routes_by_year.json...", flush=True)
    df_routes = pd.read_parquet(routes_parquet)
    
    routes_by_year_payload: Dict[str, List[Dict[str, Any]]] = {}
    for year in sorted(df_routes['year'].unique()):
        year_routes = df_routes[df_routes['year'] == year]
        route_list = []
        for _, r in year_routes.iterrows():
            route_list.append({
                'orig': str(r['orig']),
                'dest': str(r['dest']),
                'flights': int(r['flights']),
                'pax': int(r['pax']),
                'dist_km': round(float(r['dist_km']), 1)
            })
        routes_by_year_payload[str(year)] = route_list
        
    routes_by_year_payload = clean_nan_and_inf(routes_by_year_payload)

    # 5. Construção do Payload: connectivity_gaps.json
    print("   Processando lacunas de conectividade regional para connectivity_gaps.json...", flush=True)
    gaps_by_year_payload: Dict[str, Dict[str, Any]] = {}
    
    for year_str, data in yearly_graph_data.items():
        gaps_list = data.get('connectivity_gaps', [])
        
        disconnected_gaps = [g for g in gaps_list if not g.get('direct', False)]
        direct_routes = [g for g in gaps_list if g.get('direct', False)]
        
        # Ordena os desertos de rota pelos maiores desvios de conexão e distâncias
        disconnected_gaps.sort(
            key=lambda x: (x.get('detour_ratio') or 0.0, x.get('direct_dist_km') or 0.0),
            reverse=True
        )
        
        gaps_by_year_payload[year_str] = {
            'year': int(year_str),
            'nodes_count': data.get('nodes_count', 0),
            'edges_count': data.get('edges_count', 0),
            'total_flights': data.get('total_flights', 0),
            'capitals_active': data.get('capitals_active', 0),
            'capital_pairs_total': data.get('capital_pairs_total', 0),
            'capital_pairs_disconnected': data.get('capital_pairs_disconnected', 0),
            'capital_gap_percentage': data.get('capital_gap_percentage', 0.0),
            'gaps': disconnected_gaps,
            'direct_routes': direct_routes
        }
        
    gaps_by_year_payload = clean_nan_and_inf(gaps_by_year_payload)

    # 6. Gravação nos Diretórios de Saída
    for out_dir in output_dirs:
        os.makedirs(out_dir, exist_ok=True)
        print(f"\n-> Gravando arquivos JSON em: {out_dir}", flush=True)
        
        # airports_meta.json
        file_meta = os.path.join(out_dir, "airports_meta.json")
        with open(file_meta, 'w', encoding='utf-8') as f:
            json.dump(airports_payload, f, ensure_ascii=False)
        print(f"   [+] {file_meta} ({os.path.getsize(file_meta) / (1024*1024):.2f} MB)", flush=True)
        
        # routes_by_year.json
        file_routes = os.path.join(out_dir, "routes_by_year.json")
        with open(file_routes, 'w', encoding='utf-8') as f:
            json.dump(routes_by_year_payload, f, ensure_ascii=False)
        print(f"   [+] {file_routes} ({os.path.getsize(file_routes) / (1024*1024):.2f} MB)", flush=True)
        
        # connectivity_gaps.json
        file_gaps = os.path.join(out_dir, "connectivity_gaps.json")
        with open(file_gaps, 'w', encoding='utf-8') as f:
            json.dump(gaps_by_year_payload, f, ensure_ascii=False)
        print(f"   [+] {file_gaps} ({os.path.getsize(file_gaps) / (1024*1024):.2f} MB)", flush=True)
        
        # structural_holes.json (cópia alias de conveniência conforme roadmap)
        file_holes = os.path.join(out_dir, "structural_holes.json")
        with open(file_holes, 'w', encoding='utf-8') as f:
            json.dump(gaps_by_year_payload, f, ensure_ascii=False)
        print(f"   [+] {file_holes} (alias)", flush=True)

    print(f"\n[OK] Exportação de payloads concluída com sucesso em {time.time() - t0:.2f}s!", flush=True)


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    cache_json = os.path.join(base_dir, "processing", "02_graph", "yearly_graph_cache.json")
    airports_parquet = os.path.join(base_dir, "static", "parquets", "airports_filtered.parquet")
    airports_json = os.path.join(base_dir, "data", "aeroportos", "airports.json")
    routes_parquet = os.path.join(base_dir, "static", "parquets", "yearly_routes.parquet")
    
    if not os.path.exists(cache_json) or not os.path.exists(routes_parquet):
        print("Cache de grafos não encontrado. Execute processing/02_graph/01_build_yearly_graphs.py primeiro.", flush=True)
        sys.exit(1)
        
    output_dirs = [
        os.path.join(base_dir, "static", "data"),
        os.path.join(base_dir, "public", "data")
    ]
    
    export_frontend_payloads(
        cache_json,
        airports_parquet,
        airports_json,
        routes_parquet,
        output_dirs
    )


if __name__ == "__main__":
    main()
