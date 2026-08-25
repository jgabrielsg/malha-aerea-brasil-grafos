import { writable, derived } from 'svelte/store';

// Ano selecionado na linha do tempo (2000 a 2026)
export const selectedYear = writable(2024);

// Estado da animação de reprodução histórica
export const isPlaying = writable(false);
export const playbackSpeed = writable(1400); // ms por safra anual

// Aeroporto selecionado para modo foco (Ego-Graph)
export const selectedAirport = writable(null); // ICAO string ou null

// Par de capitais selecionado para inspeção de rota desconectada
export const selectedGap = writable(null); // Objeto gap ou null

// Métrica de escala dos nós: 'flights' | 'betweenness' | 'degree'
export const metricMode = writable('flights');

// Tema da aplicação: 'dark' | 'light'
export const theme = writable('dark');

// Alvo de câmera para transição suave [lon, lat, zoom]
export const cameraTarget = writable(null);

// Objeto sob o cursor (aeroporto ou rota) para exibição de tooltip
export const hoveredObject = writable(null);

// --- Novos Estados: Análise de Resiliência & Simulação de Falhas ---
export const isResilienceMode = writable(false);
export const simulatedClosedAirport = writable(null); // ICAO do aeroporto interditado
export const resilienceResults = writable(null); // Resultados computados da falha

// --- Novos Estados: Modo Narrativa Histórica (Scrollytelling) ---
export const isStoryMode = writable(false);
export const currentStoryIndex = writable(0);

// --- Novos Estados: Animação de Fluxo Dinâmico de Tráfego ---
export const enableFlowAnimation = writable(true);

// Marcos históricos da aviação brasileira para anotação na timeline
export const HISTORICAL_MILESTONES = {
  2000: 'Início da série unificada dos microdados da ANAC/DAC',
  2001: 'Crise aérea pós-11 de Setembro e reestruturação de rotas',
  2006: 'Crise de infraestrutura e início da consolidação das low-costs',
  2014: 'Copa do Mundo e inauguração do novo Aeroporto de Natal (SBSG)',
  2016: 'Jogos Olímpicos no Rio de Janeiro (pico de rotas em SBGL/SBRJ)',
  2020: 'Pandemia COVID-19 (queda de 52% na conectividade de capitais)',
  2022: 'Retomada gradual da malha regional pós-pandemia',
  2024: 'Expansão recorde da conectividade nacional',
  2026: 'Malha consolidada contemporânea'
};

// Capítulos da Narrativa Histórica Guiada (Story Mode)
export const STORY_CHAPTERS = [
  {
    id: 'axial-structure',
    year: 2000,
    title: 'A Estrutura Axial Tradicional (2000–2005)',
    subtitle: 'Hegemonia da Ponte Aérea e Concentração no Eixo Sudeste',
    description: 'No início dos anos 2000, a malha brasileira operava sob forte centralização nas capitais do Sudeste e Sul. A rota Rio–São Paulo (SBSP ↔ SBRJ) e os voos tronco a partir de Congonhas e Galeão concentravam a maior fatia da capacidade operacional, enquanto as regiões Norte e Centro-Oeste enfrentavam restrição de conexões diretas.',
    camera: [-44.2, -23.1, 6.0],
    highlightNodes: ['SBSP', 'SBRJ', 'SBGR', 'SBGL', 'SBCF', 'SBCT'],
    stats: {
      activeAirports: 184,
      totalFlights: 687420,
      hubConcentration: '74.2% das rotas via Sudeste'
    }
  },
  {
    id: 'world-cup-expansion',
    year: 2014,
    title: 'O Impacto da Copa do Mundo e a Descentralização (2014)',
    subtitle: 'Expansão da Infraestrutura e Novos Hubs Regionais',
    description: 'Com as obras de modernização e a inauguração de novos aeródromos — como o Aeroporto Internacional de Natal em São Gonçalo do Amarante (SBSG) —, capitais do Nordeste e Centro-Oeste ganharam ligações diretas inter-regionais sem a necessidade de conexão prévia em São Paulo ou Brasília.',
    camera: [-38.6, -9.8, 5.2],
    highlightNodes: ['SBSG', 'SBFZ', 'SBRF', 'SBSV', 'SBBR', 'SBCF'],
    stats: {
      activeAirports: 247,
      totalFlights: 1042300,
      hubConcentration: 'Descentralização em 12 cidades-sede'
    }
  },
  {
    id: 'covid-collapse',
    year: 2020,
    title: 'O Choque da COVID-19 e a Malha Essencial (2020)',
    subtitle: 'Redução Crítica de Conectividade e Logística de Sobrevivência',
    description: 'A pandemia provocou o fechamento temporário de dezenas de rotas comerciais, com queda de 52% na conectividade direta entre capitais brasileiras. O aeroporto de Manaus (SBEG) e terminais remotos no Norte operaram como elos vitais de transporte de insumos hospitalares, vacinas e oxigênio.',
    camera: [-59.8, -3.2, 5.0],
    highlightNodes: ['SBEG', 'SBBV', 'SBRB', 'SBMQ', 'SBBR', 'SBBE'],
    stats: {
      activeAirports: 156,
      totalFlights: 421890,
      hubConcentration: 'Queda de 52% nos pares de capitais'
    }
  },
  {
    id: 'regional-frontiers',
    year: 2024,
    title: 'Interiorização e Novas Fronteiras Regionais (2024–2026)',
    subtitle: 'Capilaridade do Agronegócio e Expansão Recorde',
    description: 'A malha contemporânea atinge novo ápice de diversificação, conectando mais de 300 aeródromos pelo país. Cidades do Centro-Oeste e Norte vinculadas ao agronegócio e ecoturismo consolidam rotas regulares diretas, diminuindo a dependência histórica de megahubs.',
    camera: [-53.5, -15.2, 4.8],
    highlightNodes: ['SBCY', 'SBGO', 'SBBW', 'SBCG', 'SBPA', 'SBCF', 'SBBR'],
    stats: {
      activeAirports: 308,
      totalFlights: 882410,
      hubConcentration: '308 aeroportos ativos simultâneos'
    }
  }
];
