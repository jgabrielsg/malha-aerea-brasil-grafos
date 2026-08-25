# GeoFlight-BR: Análise Topológica e Geoespacial da Malha Aérea Brasileira (2000–2026)

## 1. Resumo Executivo

O **GeoFlight-BR** é uma plataforma web estática de alta performance para modelagem, exploração analítica e visualização geoespacial da malha aérea comercial brasileira. Compreendendo a série histórica unificada de 26 anos (2000 a 2026) dos microdados públicos da Agência Nacional de Aviação Civil (ANAC / Registro de Voo Regular Ativo - VRA), o sistema combina conceitos da **Teoria das Redes Complexas** com computação gráfica acelerada por hardware via WebGL.

A arquitetura do projeto adota uma abordagem estrita de *Zero-Backend*, na qual o processamento intensivo de dados, a resolução de ambiguidades cadastrais de aeródromos e os cálculos topológicos em grafos são pré-computados em pipelines de engenharia de dados em Python. Os resultados são exportados em formatos estruturados e compactos para renderização em tempo real na interface gráfica desenvolvida em SvelteKit, Deck.gl e MapLibre GL.

---

## 2. Fundamentação Teórica e Análise de Redes Aéreas

A malha de transporte aéreo de passageiros constitui uma infraestrutura crítica cuja eficiência e resiliência dependem diretamente da sua organização topológica. Na literatura de sistemas de transporte e redes complexas, a configuração estrutural de uma malha aérea transita entre dois modelos fundamentais:

1. **Topologia Ponto a Ponto (*Point-to-Point*):** Caracterizada por conexões diretas entre pares de cidades, reduzindo o tempo total de viagem e eliminando escalas intermediárias, contudo exigindo densidade de demanda suficiente para sustentabilidade operacional.
2. **Topologia Radial Hub-and-Spoke:** Modelo predominante na aviação comercial contemporânea, no qual o tráfego é canalizado para aeroportos centrais concentradores de fluxo (*hubs*), de onde os passageiros realizam conexões para destinos secundários (*spokes*). No Brasil, aeroportos axiais como o Aeroporto Internacional de São Paulo/Guarulhos (`SBGR`) e o Aeroporto Internacional de Brasília (`SBBR`) desempenham este papel em escala continental.

```
       [Topologia Hub-and-Spoke]                  [Topologia Ponto a Ponto]

                 (Spoke)                                (Nó A) -------- (Nó B)
                    |                                      |    \    /    |
            (Spoke)-(HUB)-(Spoke)                          |      \/      |
                    |                                      |      /\      |
                 (Spoke)                                (Nó C) -------- (Nó D)
```

### 2.1. O Papel Estratégico dos Hubs Regionais

Em um país de dimensões continentais com barreiras geográficas acentuadas, aeródromos como o Aeroporto Internacional de Manaus (`SBEG`), o Aeroporto Internacional de Belém (`SBBE`) e o Aeroporto Internacional Salgado Filho (`SBPA`) atuam como nós integradores essenciais. Na Região Amazônica, onde o modal rodoviário é frequentemente inviável ou sazonalmente restrito, os hubs regionais constituem as únicas artérias logísticas de integração com o Sistema Integrado de Saúde, Defesa Nacional e abastecimento econômico.

### 2.2. Desertos de Rota e Desconexão Regional

A dependência excessiva do modelo *hub-and-spoke* pode gerar ineficiências severas conhecidas como **desertos de rota**. Este fenômeno manifesta-se pela ausência sistemática de voos regulares diretos entre centros populacionais relevantes, compelindo os passageiros a realizarem desvios geográficos e operacionais substanciais.

Um exemplo emblemático identificado na malha histórica brasileira é o par entre **Boa Vista (`SBBV`)** e **Macapá (`SBMQ`)**: capitais da Região Norte que distam geograficamente aproximadamente 1.100 km em linha reta, mas que, na ausência de rota direta, exigem conexões por Manaus (`SBEG`) ou Brasília (`SBBR`), elevando a distância percorrida para mais de 3.000 km, quadruplicando o tempo de trânsito e aumentando os custos energéticos e tarifários.

---

## 3. Modelagem Matemática e Teoria dos Grafos

A rede de transporte aéreo é modelada como uma sequência temporal de grafos direcionados e ponderados $G_t = (V_t, E_t)$ para cada safra anual $t \in [2000, 2026]$, onde:
* $V_t$ representa o conjunto de aeroportos que registraram operações comerciais ativas no ano $t$.
* $E_t$ representa o conjunto de rotas direcionadas $(u, v)$ operadas entre a origem $u$ e o destino $v$ no ano $t$.

```
                       w_ij (Voos / Pax)
           (Aeroporto i) ------------> (Aeroporto j)
                 |                            ^
                 |                            |
                 +-----------> (HUB) ---------+
```

### 3.1. Grau e Força do Nó

Para cada aeroporto $i \in V_t$:
* **Grau de Entrada ($k_i^{\text{in}}$) e Saída ($k_i^{\text{out}}$):** Quantidade de cidades distintas conectadas diretamente ao aeroporto:
  $$k_i = k_i^{\text{in}} + k_i^{\text{out}}$$
* **Força do Nó ($s_i$ / Node Strength):** Soma ponderada do peso das arestas incidentes, refletindo o volume absoluto de decolagens e passageiros transportados:
  $$s_i = \sum_{j \in V_t} w_{ij}$$

### 3.2. Centralidade de Intermediação (*Betweenness Centrality*)

A centralidade de intermediação quantifica a frequência com que um aeroporto $v$ atua como nó de conexão nos caminhos geodésicos mínimos entre todos os outros pares da malha:

$$C_B(v) = \sum_{s \neq v \neq t \in V} \frac{\sigma_{st}(v)}{\sigma_{st}}$$

Onde $\sigma_{st}$ representa o número total de caminhos mínimos entre a origem $s$ e o destino $t$, e $\sigma_{st}(v)$ é o número de tais caminhos que passam pelo nó $v$. Nós com elevado $C_B(v)$ (como `SBBR`, `SBGR` e `SBKP`) são pontos de estrangulamento crítico da rede (*bottlenecks*), cuja indisponibilidade operacional provoca efeito cascata de atrasos em escala nacional.

Para comparabilidade justa entre anos com diferentes números de aeroportos ativos $|V_t|$, utiliza-se a métrica normalizada:

$$C_B^{\text{norm}}(v) = \frac{2 \cdot C_B(v)}{(|V_t| - 1)(|V_t| - 2)}$$

### 3.3. Caminhos Mínimos e Taxa de Desvio (*Detour Ratio*)

Para cada par de capitais estaduais $(u, v)$ que não possui rota direta no ano $t$, calcula-se o caminho mínimo ponderado pela distância geodésica em quilômetros via algoritmo de Dijkstra:

$$d_{\text{rede}}(u, v) = \min_{P_{uv}} \sum_{(i, j) \in P_{uv}} \text{dist}_{\text{haversine}}(i, j)$$

A ineficiência geométrica da conexão é formalizada pelo **Detour Ratio**:

$$\text{Detour Ratio}(u, v) = \frac{d_{\text{rede}}(u, v)}{d_{\text{geodésica}}(u, v)}$$

Um índice $\text{Detour Ratio} = 1.0$ representa uma rota direta ideal. Valores superiores a $1.5$ indicam penalidades de rota severas (acréscimo de mais de 50% na distância percorrida devido à necessidade de conexões intermediárias).

---

## 4. Pipeline de Engenharia de Dados (ETL)

```
[ Microdados ANAC (VRA) ] (22.9M registros)
            │
            ▼
 [ 01_unifying_anac_flights.py ] ──► [ vra_unified.parquet ]
            │
            ▼
 [ 04_clean_and_map_icaos.py ]   ──► [ vra_final_unified.parquet ] (SBNT ➔ SBSG, etc.)
            │
            ▼
 [ 01_build_yearly_graphs.py ]   ──► [ NetworkX Graph Engine ]
            │                         ├─ Betweenness Centrality
            │                         ├─ Degree / Strength
            │                         └─ Dijkstra Shortest Paths
            ▼
 [ 01_export_frontend_payloads.py ]
            │
            ├─► /data/airports_meta.json      (1.166 aeroportos estruturados)
            ├─► /data/routes_by_year.json     (Rotas anuais com fluxos agregados)
            └─► /data/connectivity_gaps.json  (Matriz 27x27 de capitais e desvios)
```

O pipeline de dados foi desenvolvido em Python 3.11+, utilizando Pandas, Polars, PyArrow e NetworkX:

1. **Unificação e Sanitização da Base ANAC:** Consolidação de mais de 22,9 milhões de registros históricos de voos do VRA entre 2000 e 2026. Filtragem rigorosa para manter apenas voos regulares e não-regulares comerciais efetivamente realizados.
2. **Resolução de Descontinuidades Temporais e Fusões de ICAO:** Tratamento de alterações cadastrais históricas ao longo de 26 anos. O caso mais proeminente é o do Aeroporto de Natal, onde as operações foram migradas do antigo Aeroporto Augusto Severo (`SBNT`) para o novo Aeroporto Internacional Governador Aluízio Alves em São Gonçalo do Amarante (`SBSG`) a partir de 2014.
3. **Curadoria Cadastral dos Aeródromos:** Integração inicial baseada no repositório `mwgg/Airports`, complementada por curadoria própria para inserção e correção de coordenadas geográficas (latitude/longitude em WGS84), elevação topográfica em pés e fusos horários oficiais (IANA) para centenas de aeródromos regionais e pistas municipais da Amazônia Legal não listadas em bases globais.
4. **Pré-computação Estática e Otimização:** O cálculo matricial de centralidade e caminhos mínimos de todos os anos é exportado em arquivos JSON estáticos e compactos, eliminando qualquer dependência de consultas SQL ou servidores de inferência em tempo de execução no cliente.

---

## 5. Arquitetura de Software e Interface

A interface de visualização adota o paradigma de aplicação de página única (*Single Page Application* - SPA), compilada como artefato estático para entrega contínua via CDN.

```
┌────────────────────────────────────────────────────────────────────────┐
│ GeoFlight-BR Header (Padrão Gov.br / Alternador Dark-Light Mode)       │
├────────────────────────────────┬───────────────────────────────────────┤
│ MapLibre GL + Deck.gl Engine   │ Painel Retrátil (AirportPanel)        │
│                                │ ├─ Métricas do Nó (Grau / Hub Score)  │
│ ├─ ScatterplotLayer (Nós/Hubs) │ └─ Top 10 Destinos Diretos            │
│ ├─ ArcLayer 3D (Fluxo de Voos) │                                       │
│ └─ Transições de Câmera 3D     ├───────────────────────────────────────┤
│                                │ Inspetor de Desertos (GapInspector)   │
├────────────────────────────────┤ ├─ Matriz de Desconexão de Capitais   │
│ TimelineController (2000–2026) │ └─ Traçado de Escalas Mínimas         │
└────────────────────────────────┴───────────────────────────────────────┘
```

* **Framework Web:** SvelteKit configurado com `@sveltejs/adapter-static` (`fallback: 'index.html'`, `precompress: true`).
* **Motor Geoespacial:** Deck.gl v9 (`@deck.gl/core`, `@deck.gl/layers`, `@deck.gl/mapbox`) integrado ao MapLibre GL v5, utilizando camadas `ScatterplotLayer` para aeroportos e `ArcLayer` tridimensional com curvatura geodésica (*Great Circle*) para as rotas.
* **Mapas Base:** CartoDB Dark Matter para o modo noturno e CartoDB Positron para o modo diurno institucional.
* **Estilização e Acessibilidade:** TailwindCSS estruturado sob os princípios do **Padrão Digital de Governo (Gov.br)**, com paleta de alto contraste, tipografia neutra (`Inter`) e fontes monoespaçadas (`JetBrains Mono`) para dados técnicos.

---

## 6. Estrutura do Repositório

```text
├── build/                                # Artefatos estáticos prontos para deploy
│   ├── _app/                             # Bundles JS/CSS versionados e pré-comprimidos (.br/.gz)
│   ├── data/                             # Payloads estáticos consumidos pela interface
│   │   ├── airports_meta.json
│   │   ├── connectivity_gaps.json
│   │   └── routes_by_year.json
│   └── index.html
├── data/                                 # Dados brutos de entrada
│   ├── aeroportos/                       # Base cadastral de aeródromos e mapeamentos ICAO
│   └── voos/                             # Microdados anuais ANAC/VRA (CSV/Parquet)
├── processing/                           # Pipeline de Engenharia de Dados e Grafos
│   ├── 01_preparing_datasets/            # Scripts de unificação e sanitização
│   ├── 02_graph/                         # Modelagem topológica e cálculo de métricas NetworkX
│   ├── 03_final_parquet/                 # Exportação dos payloads JSON otimizados
│   └── validate_pipeline.py              # Suíte de 15 testes automatizados de integridade
├── src/                                  # Código-fonte da aplicação front-end
│   ├── app.css                           # Estilos globais e utilitários Tailwind
│   ├── app.html                          # Template HTML principal
│   ├── lib/
│   │   ├── components/                   # Componentes de interface (FlightMap, Panels, Timeline)
│   │   ├── icons/                        # Catálogo de ícones SVG vetorizados
│   │   └── stores/                       # Gerenciamento de estado reativo (Svelte Stores)
│   └── routes/                           # Roteamento SPA
├── netlify.toml                          # Configuração de deploy, rotas SPA e cabeçalhos de cache
├── package.json                          # Dependências e scripts do ecossistema Node.js
├── svelte.config.js                      # Configuração do adaptador estático SvelteKit
├── tailwind.config.js                    # Tema de cores institucional e dark mode
└── vite.config.js                        # Configuração do bundler Vite
```

---

## 7. Guia de Reprodução e Execução Local

### 7.1. Pré-requisitos
* Python 3.11 ou superior.
* Node.js 20.x ou 22.x e npm 10+.

### 7.2. Execução do Pipeline de Dados (Python)

1. Instale os pacotes Python requeridos:
   ```bash
   pip install pandas polars networkx pyarrow haversine
   ```

2. Execute o pipeline de modelagem topológica e exportação dos dados:
   ```bash
   # Processamento das redes anuais e cálculo de centralidade
   python processing/02_graph/01_build_yearly_graphs.py

   # Geração dos payloads JSON estáticos para o front-end
   python processing/03_final_parquet/01_export_frontend_payloads.py

   # Execução da suíte de validação e consistência dos dados
   python processing/validate_pipeline.py
   ```

### 7.3. Execução da Interface Web (Front-end)

1. Instale as dependências do projeto:
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```
   Acesse a aplicação no navegador em `http://localhost:5173`.

3. Compilação do build estático de produção:
   ```bash
   npm run build
   ```
   Os arquivos finais otimizados e pré-comprimidos em formatos Brotli (`.br`) e Gzip (`.gz`) serão gravados no diretório `build/`.

4. Para testar o build estático localmente:
   ```bash
   npm run preview
   ```

---

## 8. Estratégia de Deploy e Infraestrutura

A aplicação é configurada para hospedagem estática em plataformas como Netlify, Vercel ou GitHub Pages, com as seguintes políticas definidas no arquivo `netlify.toml`:

* **Roteamento SPA:** Redirecionamento de todas as rotas para `index.html` com código de status HTTP `200` (`/* /index.html 200`), prevenindo erros 404 em atualizações manuais de página.
* **Políticas de Cache HTTP:**
  * Payloads de dados (`/data/*.json`): `Cache-Control: public, max-age=31536000, immutable` (persistência em cache de longa duração).
  * Assets compilados (`/_app/immutable/*`): `Cache-Control: public, max-age=31536000, immutable`.
  * Documento HTML raiz (`/index.html`): `Cache-Control: public, max-age=0, must-revalidate` (propagação instantânea de novas versões).
* **Cabeçalhos de Segurança:** Inclusão de `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 9. Fontes de Dados e Referências Institucionais

* **Agência Nacional de Aviação Civil (ANAC):** Microdados de Voos e Operações Aéreas (Registro VRA - Voo Regular Ativo / Dados Estatísticos). Disponível em: [https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/](https://sistemas.anac.gov.br/dadosabertos/Voos%20e%20opera%C3%A7%C3%B5es%20a%C3%A9reas/)
* **Base Cadastral Geográfica Inicial de Aeródromos:** Repositório `mwgg/Airports`. Disponível em: [https://github.com/mwgg/Airports](https://github.com/mwgg/Airports) (com curadoria e ampliações proprietárias da equipe do GeoFlight-BR).
* **Padrão Digital de Governo (Gov.br):** Diretrizes de Identidade Visual, Tipografia e Acessibilidade do Governo Federal Brasileiro.
* **CartoDB Basemaps:** Camadas de mapa base vetoriais e raster Dark Matter e Positron.

---

## 10. Licença

Este projeto é distribuído sob a licença de software livre **MIT**. Os dados estatísticos processados são de domínio público, de acordo com a Lei de Acesso à Informação (Lei nº 12.527/2011).
