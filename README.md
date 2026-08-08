# Malha Aérea Brasil (2000–2026)

Este projeto tem como objetivo processar, analisar e visualizar a evolução histórica da malha aérea comercial e 
civil brasileira ao longo de 26 anos (2000 a 2026), utilizando Teoria dos Grafos e processamento eficiente de dados geoespaciais.

A aplicação final permitirá aos usuários interagir com um mapa dinâmico para analisar conexões entre aeroportos, 
visualizar rotas frequentes e identificar a complexidade de rotas regionais (necessidade de escalas e conexões).

---

## Fonte dos Dados

Os dados brutos de voos foram obtidos através do portal de Dados Abertos da **ANAC (Agência Nacional de Aviação Civil)**:

* **Base Primária:** [ANAC - Dados Abertos de Voos e Operações Aéreas](https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/)
* **Escopo Temporal:** Janeiro de 2000 a Junho de 2026 (Relatórios VRA - Voo Regular Ativo).
* **Entidades:** Registros de voos civis e comerciais (origem, destino, horários previstos/reais, situação do voo e código da empresa aérea).

Os metadados geoespaciais (latitude, longitude, cidade, estado e elevação dos aeroportos) foram extraídos e 
consolidados a partir deste [repositório](https://github.com/mwgg/Airports), além de adições manuais para aeroportos que
mudaram de nome ou que faltavam no csv em questão, como alguns aeroportos do interior brasileiro.

---

## Arquitetura do Pipeline de Dados (ETL)

O projeto utiliza um pipeline em Python para transformar arquivos CSV brutos em formatos colunares otimizados para leitura analítica de alta performance:

1. **Unificação e Consolidação (`01_unifying_anac_flights.py`):** Leitura dos últimos 26 anos e seus dados mensais da Anac e descarte de registros
   nulos/duplicados e consolidação em formato Parquet (mais leve).
2. **Higienização Geográfica (`02_filtering_airports.py`):** Filtro e cruzamento do cadastro global de aeroportos para isolar apenas os nós ativos presentes na base da ANAC.
3. **Auditoria de Integridade (`03_validate_icaos.py`):** Verificação de integridade referencial entre códigos ICAO de voos e coordenadas geográficas disponíveis.
4. **Mapeamento Histórico e Limpeza (`04_clean_and_map_icaos.py`):** 
   * Filtro de códigos fora do padrão ICAO (como os contendo menos de 4 letras)
   * Aplicação de tabela de mapeamento (`De -> Para`) para alinhar códigos de aeródromos alterados ou desativados ao longo dos 26 anos.
   * Expurgo de aeródromos com baixa relevância estatística (< 50 ocorrências no histórico).

---

## Estrutura do Repositório

```text
.
├── data/
│   └── aeroportos/
│       └── icao_mapping.csv      # Tabela de de/para para correções históricas
├── processing/
│   ├── 01_preparing_datasets/   # Scripts de extração, validação e limpeza
│   ├── 02_graph/                # Modelagem do grafo de conexões (em breve)
│   └── 03_final_parquet/        # Exportação dos parquets finais de saída (em breve)
└── static/
    └── parquets/                # Datasets tratados em formato Apache Parquet
