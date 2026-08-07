"""
Arquivo que aplica regras de qualidade aos códigos ICAO dos voos e finaliza o dataset.

1. Remove códigos fora do padrão ICAO (exatamente 4 letras, sem números ou símbolos).
2. Aplica o mapeamento histórico (icao_mapping.csv) para atualizar códigos obsoletos.
3. Remove voos envolvendo aeroportos com menos de 50 ocorrências no total.
4. Garante que todos os aeroportos restantes existam na base de coordenadas.
5. Salva o dataset consolidado em static/parquets/vra_final_unified.parquet.
"""

import os
import pandas as pd

def main():
    voos_file = os.path.join("static", "parquets", "vra_unified.parquet")
    aeroportos_file = os.path.join("static", "parquets", "airports_br.parquet")
    mapping_file = os.path.join("data", "aeroportos", "icao_mapping.csv")
    output_file = os.path.join("static", "parquets", "vra_final_unified.parquet")

    if not os.path.exists(voos_file) or not os.path.exists(aeroportos_file):
        print("Arquivos de dados não encontrados. Verifique os caminhos.")
        return

    print("Carregando bases...")
    df_voos = pd.read_parquet(voos_file)
    df_aeroportos = pd.read_parquet(aeroportos_file, columns=['icao'])
    total_inicial = len(df_voos)

    # 1. Filtro RegEx: Exatamente 4 letras (remove lixo, números e interrogações)
    regex_icao = r'^[A-Za-z]{4}$'
    mask_origem = df_voos['ICAO Aeródromo Origem'].str.match(regex_icao, na=False)
    mask_destino = df_voos['ICAO Aeródromo Destino'].str.match(regex_icao, na=False)
    df_voos = df_voos[mask_origem & mask_destino].copy()
    
    print(f"Voos removidos (fora do padrão ICAO): {total_inicial - len(df_voos)}")

    # 2. Aplicação do Mapeamento Histórico
    if os.path.exists(mapping_file):
        df_map = pd.read_csv(mapping_file)
        
        # Limpa espaços em branco nos nomes das colunas e nos valores
        df_map.columns = df_map.columns.str.strip()
        df_map['icao_antigo'] = df_map['icao_antigo'].str.strip()
        df_map['icao_novo'] = df_map['icao_novo'].str.strip()
        
        map_dict = dict(zip(df_map['icao_antigo'], df_map['icao_novo']))
        
        df_voos['ICAO Aeródromo Origem'] = df_voos['ICAO Aeródromo Origem'].replace(map_dict)
        df_voos['ICAO Aeródromo Destino'] = df_voos['ICAO Aeródromo Destino'].replace(map_dict)
        print(f"Mapeamento histórico aplicado ({len(map_dict)} regras).")
    else:
        print("Aviso: icao_mapping.csv não encontrado. Mapeamento ignorado.")

    # 3. Filtro de Frequência (< 50 ocorrências totais)
    freq_origem = df_voos['ICAO Aeródromo Origem'].value_counts()
    freq_destino = df_voos['ICAO Aeródromo Destino'].value_counts()
    freq_total = freq_origem.add(freq_destino, fill_value=0)
    
    icaos_frequentes = set(freq_total[freq_total >= 50].index)
    
    mask_freq_origem = df_voos['ICAO Aeródromo Origem'].isin(icaos_frequentes)
    mask_freq_destino = df_voos['ICAO Aeródromo Destino'].isin(icaos_frequentes)
    
    len_pre_freq = len(df_voos)
    df_voos = df_voos[mask_freq_origem & mask_freq_destino]
    print(f"Voos removidos (ICAOs com menos de 50 ocorrências): {len_pre_freq - len(df_voos)}")

    # 4. Filtro Espacial (Garantir que a Origem e Destino existam no JSON)
    icaos_cadastro = set(df_aeroportos['icao'].unique())
    mask_cadastro_origem = df_voos['ICAO Aeródromo Origem'].isin(icaos_cadastro)
    mask_cadastro_destino = df_voos['ICAO Aeródromo Destino'].isin(icaos_cadastro)
    
    len_pre_cadastro = len(df_voos)
    df_voos = df_voos[mask_cadastro_origem & mask_cadastro_destino]
    print(f"Voos removidos (ICAOs ainda ausentes no cadastro): {len_pre_cadastro - len(df_voos)}")

    # Salva o arquivo final
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df_voos.to_parquet(output_file, index=False)
    
    print(f"\nDataset FINAL unificado e limpo salvo em: {output_file}")
    print(f"Total de voos válidos para o grafo: {len(df_voos)}")

if __name__ == "__main__":
    main()