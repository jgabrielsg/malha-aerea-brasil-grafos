import { writable, derived, get } from 'svelte/store';
import { base } from '$app/paths';
import { selectedYear, selectedAirport, selectedGap } from './flightState.js';

// Estado de carregamento dos dados estáticos
export const isLoading = writable(true);
export const loadError = writable(null);

// Dados mestres brutos carregados dos JSONs estáticos
export const rawAirports = writable({});
export const rawRoutesByYear = writable({});
export const rawGapsByYear = writable({});

/**
 * Carrega todos os payloads JSON estáticos de forma assíncrona.
 * Utiliza o prefixo base de $app/paths para compatibilidade com deploy no Netlify/subcaminhos.
 */
export async function loadFlightData() {
  isLoading.set(true);
  loadError.set(null);

  try {
    const basePath = base || '';
    const [resAirports, resRoutes, resGaps] = await Promise.all([
      fetch(`${basePath}/data/airports_meta.json`),
      fetch(`${basePath}/data/routes_by_year.json`),
      fetch(`${basePath}/data/connectivity_gaps.json`)
    ]);

    const responses = [
      { name: 'airports_meta.json', res: resAirports },
      { name: 'routes_by_year.json', res: resRoutes },
      { name: 'connectivity_gaps.json', res: resGaps }
    ];

    for (const item of responses) {
      if (!item.res.ok) {
        throw new Error(`Erro HTTP ${item.res.status} ao carregar ${item.name}.`);
      }
      const contentType = item.res.headers.get('content-type') || '';
      if (contentType.includes('text/html') || !contentType.includes('json')) {
        throw new Error(`Arquivo estático /data/${item.name} não encontrado ou retornou HTML (redirecionamento SPA). Verifique a pasta static/data/.`);
      }
    }

    const [dataAirports, dataRoutes, dataGaps] = await Promise.all([
      resAirports.json(),
      resRoutes.json(),
      resGaps.json()
    ]);

    rawAirports.set(dataAirports.airports || {});
    rawRoutesByYear.set(dataRoutes || {});
    rawGapsByYear.set(dataGaps || {});
    isLoading.set(false);
  } catch (err) {
    console.error('Erro ao carregar dados do GeoFlight-BR:', err);
    loadError.set(err.message || 'Erro de conexão com os dados estáticos.');
    isLoading.set(false);
  }
}

// Lista de aeroportos ordenada por relevância para busca e autocomplete
export const airportsList = derived(rawAirports, ($airports) => {
  return Object.values($airports).sort((a, b) => {
    // Prioriza capitais e aeroportos com mais voos acumulados
    if (a.is_capital && !b.is_capital) return -1;
    if (!a.is_capital && b.is_capital) return 1;
    return (b.summary?.total_flights || 0) - (a.summary?.total_flights || 0);
  });
});

// Rotas ativas no ano selecionado
export const currentRoutes = derived(
  [rawRoutesByYear, selectedYear],
  ([$routesByYear, $year]) => {
    return $routesByYear[String($year)] || [];
  }
);

// Lacunas de capitais no ano selecionado
export const currentGapsData = derived(
  [rawGapsByYear, selectedYear],
  ([$gapsByYear, $year]) => {
    return $gapsByYear[String($year)] || {
      gaps: [],
      direct_routes: [],
      nodes_count: 0,
      edges_count: 0,
      total_flights: 0,
      capital_gap_percentage: 0
    };
  }
);

// Estatísticas globais do ano selecionado para o Header e Dashboard
export const currentYearStats = derived(
  [currentRoutes, currentGapsData, selectedYear],
  ([$routes, $gapsData, $year]) => {
    const totalFlights = $routes.reduce((acc, r) => acc + (r.flights || 0), 0);
    const totalPax = $routes.reduce((acc, r) => acc + (r.pax || 0), 0);
    
    const uniqueIcaos = new Set();
    $routes.forEach(r => {
      uniqueIcaos.add(r.orig);
      uniqueIcaos.add(r.dest);
    });

    return {
      year: $year,
      activeAirports: uniqueIcaos.size,
      activeRoutes: $routes.length,
      totalFlights,
      totalPax,
      capitalsDisconnected: $gapsData.capital_pairs_disconnected || 0,
      capitalsTotalPairs: $gapsData.capital_pairs_total || 351,
      gapPercentage: $gapsData.capital_gap_percentage || 0
    };
  }
);

// Nós de aeroportos ativos no ano corrente enriquecidos com suas métricas daquele ano
export const activeYearAirports = derived(
  [rawAirports, selectedYear, currentRoutes],
  ([$airports, $year, $routes]) => {
    const yearStr = String($year);
    const activeIcaos = new Set();
    $routes.forEach(r => {
      activeIcaos.add(r.orig);
      activeIcaos.add(r.dest);
    });

    const activeList = [];
    activeIcaos.forEach(icao => {
      const air = $airports[icao];
      if (air) {
        const metrics = air.yearly?.[yearStr] || {
          degree: 0,
          in_degree: 0,
          out_degree: 0,
          strength: 0,
          betweenness: 0,
          betweenness_norm: 0,
          top_destinations: []
        };
        activeList.push({
          ...air,
          metrics,
          // coordenadas prontas para Deck.gl [lon, lat]
          coordinates: [air.lon, air.lat]
        });
      }
    });

    return activeList;
  }
);

// Detalhamento do aeroporto atualmente selecionado para o painel lateral
export const selectedAirportDetails = derived(
  [rawAirports, selectedAirport, selectedYear, currentRoutes],
  ([$airports, $selectedIcao, $year, $routes]) => {
    if (!$selectedIcao || !$airports[$selectedIcao]) return null;

    const airport = $airports[$selectedIcao];
    const yearStr = String($year);
    const metrics = airport.yearly?.[yearStr] || {
      degree: 0,
      in_degree: 0,
      out_degree: 0,
      strength: 0,
      betweenness: 0,
      betweenness_norm: 0,
      top_destinations: []
    };

    // Conexões ativas diretas a partir e para este nó
    const outgoing = $routes.filter(r => r.orig === $selectedIcao);
    const incoming = $routes.filter(r => r.dest === $selectedIcao);

    return {
      ...airport,
      metrics,
      outgoingRoutes: outgoing,
      incomingRoutes: incoming,
      totalConnectedAirports: new Set([...outgoing.map(r => r.dest), ...incoming.map(r => r.orig)]).size
    };
  }
);
