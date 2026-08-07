"""
Arquivo que processa e unifica os dados brutos de voos da ANAC.

Lê todos os CSVs de data/voos/, unifica-os, realiza validações de 
qualidade (remoção de nulos, duplicatas e faltantes) e exporta um
arquivo Parquet consolidado. Será utilizado na etapa 02_graph 
para modelagem das conexões.
"""

import os
import glob
import pandas as pd

def main():
    """
    Executa a leitura, concatenação, Análise Exploratória de Dados (EDA) 
    e salvamento do dataset unificado.
    """
    input_pattern = os.path.join("data", "voos", "VRA_*.csv")
    output_file = os.path.join("static", "parquets", "vra_unified.parquet")
    
    arquivos = glob.glob(input_pattern)
    if not arquivos:
        print("Nenhum arquivo encontrado. Verifique o caminho.")
        return

    lista_dfs = []
    
    print(f"Processando {len(arquivos)} arquivos...")
    for arquivo in arquivos:
        nome_base = os.path.basename(arquivo)
        ano_mes = nome_base.replace("VRA_", "").replace(".csv", "")
        
        try:
            df_temp = pd.read_csv(
                arquivo, 
                sep=';', 
                skiprows=1, 
                encoding='utf-8', 
                dtype=str
            )
            df_temp['Referencia_Ano_Mes'] = ano_mes
            lista_dfs.append(df_temp)
        except Exception as erro:
            print(f"Falha ao processar {arquivo}: {erro}")

    df_full = pd.concat(lista_dfs, ignore_index=True)
    
    print("\n--- Análise Exploratória (EDA) ---")
    total_inicial = len(df_full)
    print(f"Total de registros carregados: {total_inicial}")

    df_full = df_full.dropna(how='all')
    total_sem_nulos = len(df_full)
    print(f"Registros 100% nulos removidos: {total_inicial - total_sem_nulos}")

    df_full = df_full.drop_duplicates()
    total_sem_duplicatas = len(df_full)
    print(f"Registros duplicados removidos: {total_sem_nulos - total_sem_duplicatas}")

    colunas_essenciais = ['ICAO Aeródromo Origem', 'ICAO Aeródromo Destino']
    df_full = df_full.dropna(subset=colunas_essenciais)
    total_com_essenciais = len(df_full)
    print(f"Registros excluídos por falta de Origem/Destino: {total_sem_duplicatas - total_com_essenciais}")

    print("\nRotas mais frequentes nos dados brutos:")
    rotas = df_full.groupby(colunas_essenciais).size().sort_values(ascending=False).head(5)
    print(rotas)

    df_full = df_full[df_full['Situação Voo'] == 'REALIZADO']
    print(f"\nTotal de voos válidos (REALIZADO): {len(df_full)}")

    # Garante que o diretório de destino exista
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    df_full.to_parquet(output_file, index=False)
    
    print(f"\nDataset unificado salvo em: {output_file}")

if __name__ == "__main__":
    main()