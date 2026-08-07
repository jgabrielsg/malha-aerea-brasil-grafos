"""
Arquivo que valida a integridade referencial entre voos e aeroportos.

1. Filtra ruídos nos dados da ANAC (exige exatamente 4 letras, sem números).
2. Verifica quais códigos ICAO válidos presentes nos voos não estão no cadastro.
3. Imprime a lista completa e a frequência de todos os códigos faltantes 
   para orientar a criação de uma tabela de mapeamento (mapping table).
"""

import os
import pandas as pd

def main():
    voos_file = os.path.join("static", "parquets", "vra_unified.parquet")
    aeroportos_file = os.path.join("static", "parquets", "airports_filtered.parquet")

    if not os.path.exists(voos_file) or not os.path.exists(aeroportos_file):
        print(f"Arquivos não encontrados. Verifique os caminhos:\n- {voos_file}\n- {aeroportos_file}")
        return

    print("Carregando bases de dados...")
    df_voos = pd.read_parquet(voos_file, columns=['ICAO Aeródromo Origem', 'ICAO Aeródromo Destino'])
    df_aeroportos = pd.read_parquet(aeroportos_file, columns=['icao'])

    total_inicial = len(df_voos)

    # Aplica a regra oficial da ICAO: exatamente 4 letras (A-Z), sem números ou espaços.
    regex_icao = r'^[A-Za-z]{4}$'
    mask_origem = df_voos['ICAO Aeródromo Origem'].str.match(regex_icao, na=False)
    mask_destino = df_voos['ICAO Aeródromo Destino'].str.match(regex_icao, na=False)

    df_voos_limpo = df_voos[mask_origem & mask_destino].copy()
    
    print(f"Voos ignorados por conterem códigos fora do padrão ICAO (lixo/IATA): {total_inicial - len(df_voos_limpo)}")

    # Isola os ICAOs únicos da base de voos e do cadastro
    icaos_origem = set(df_voos_limpo['ICAO Aeródromo Origem'].unique())
    icaos_destino = set(df_voos_limpo['ICAO Aeródromo Destino'].unique())
    icaos_voos = icaos_origem.union(icaos_destino)

    icaos_cadastro = set(df_aeroportos['icao'].dropna().unique())

    # Identifica os faltantes
    icaos_faltantes = icaos_voos - icaos_cadastro

    print("\n--- Validação de Integridade Referencial ---")
    print(f"Total de ICAOs válidos únicos nos voos: {len(icaos_voos)}")
    print(f"Total de ICAOs no cadastro: {len(icaos_cadastro)}")

    if not icaos_faltantes:
        print("\nSUCESSO: Todos os aeroportos válidos dos voos estão presentes no cadastro.")
        return

    print(f"\nAVISO: Foram encontrados {len(icaos_faltantes)} códigos ICAO nos voos sem correspondência no cadastro.")
    
    # Filtra apenas os registros que contêm os ICAOs faltantes
    mask_faltante_origem = df_voos_limpo['ICAO Aeródromo Origem'].isin(icaos_faltantes)
    mask_faltante_destino = df_voos_limpo['ICAO Aeródromo Destino'].isin(icaos_faltantes)
    
    df_orfaos_origem = df_voos_limpo[mask_faltante_origem]['ICAO Aeródromo Origem']
    df_orfaos_destino = df_voos_limpo[mask_faltante_destino]['ICAO Aeródromo Destino']

    # Consolida a contagem total (soma as vezes que apareceu como origem e como destino)
    contagem_total = pd.concat([df_orfaos_origem, df_orfaos_destino]).value_counts()
    contagem_filtrada = contagem_total[contagem_total > 50]
    
    # Configura o Pandas para exibir todas as linhas sem truncar
    pd.set_option('display.max_rows', None)
    
    print("\nLista completa de ICAOs faltantes e suas respectivas frequências totais de voos:")
    print("--------------------------------------------------------------------------------")
    print(contagem_filtrada)
    
    # Reseta a configuração de display do Pandas por segurança
    pd.reset_option('display.max_rows')

if __name__ == "__main__":
    main()