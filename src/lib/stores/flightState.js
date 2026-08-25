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
