"""
Arquivo que filtra os dados globais de aeroportos (nós do grafo).

Lê o arquivo airports.json e o dataset unificado de voos. Filtra para 
manter todos os aeroportos (nacionais e internacionais) que possuem 
ao menos um voo na base da ANAC. Adicionalmente, identifica e lista 
todos os códigos ICAO presentes nos voos, mas ausentes no arquivo JSON.
Exporta o resultado em formato Parquet.
"""

import os
import json
import pandas as pd

def main():
    """
    Extrai ICAOs da base de voos, cruza com o JSON global, filtra os ativos
    e lista os aeroportos não encontrados na base de referência geométrica.
    """
    voos_file = os.path.join("static", "parquets", "vra_unified.parquet")
    aeroportos_json = os.path.join("data", "aeroportos", "airports.json")
    output_file = os.path.join("static", "parquets", "airports_filtered.parquet")
    
    if not os.path.exists(voos_file) or not os.path.exists(aeroportos_json):
        print("Arquivos de entrada não encontrados.")
        return

    print("Carregando códigos ICAO da base de voos...")
    df_voos = pd.read_parquet(
        voos_file, 
        columns=['ICAO Aeródromo Origem', 'ICAO Aeródromo Destino']
    )
    
    icaos_ativos = set(df_voos['ICAO Aeródromo Origem'].dropna().unique()).union(
        set(df_voos['ICAO Aeródromo Destino'].dropna().unique())
    )
    print(f"Total de ICAOs únicos nos dados da ANAC: {len(icaos_ativos)}")

    print("Carregando base global de aeroportos...")
    with open(aeroportos_json, 'r', encoding='utf-8') as f:
        dados_json = json.load(f)
        
    df_aeroportos = pd.DataFrame.from_dict(dados_json, orient='index')
    
    colunas_desejadas = ['icao', 'name', 'city', 'state', 'country', 'lat', 'lon']
    df_aeroportos = df_aeroportos[colunas_desejadas]

    df_ativos = df_aeroportos[df_aeroportos['icao'].isin(icaos_ativos)].copy()
    icaos_encontrados = set(df_ativos['icao'].unique())
    
    icaos_faltantes = icaos_ativos - icaos_encontrados

    print("\n--- Resultados do Filtro ---")
    print(f"Aeroportos no JSON original: {len(df_aeroportos)}")
    print(f"Aeroportos mantidos (com voos): {len(df_ativos)}")
    print(f" - Aeroportos do Brasil: {len(df_ativos[df_ativos['country'] == 'BR'])}")
    print(f" - Aeroportos Internacionais: {len(df_ativos[df_ativos['country'] != 'BR'])}")
    
    print(f"\nICAOs nos voos, mas ausentes no JSON ({len(icaos_faltantes)} no total):")
    if icaos_faltantes:
        lista_faltantes = sorted(list(icaos_faltantes))
        print(lista_faltantes)
        print("\nMotivo provável: Mudanças de código ICAO ao longo dos 26 anos (códigos desativados) ou aeródromos/bases militares não mapeados na fonte do JSON.")
    else:
        print("Nenhum. Todos os ICAOs foram encontrados no cadastro.")

    df_ativos.reset_index(drop=True, inplace=True)
    df_ativos.to_parquet(output_file, index=False)
    print(f"\nArquivo salvo em: {output_file}")

if __name__ == "__main__":
    main()