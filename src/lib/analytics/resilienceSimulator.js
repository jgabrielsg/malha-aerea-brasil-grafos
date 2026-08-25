/**
 * Motor Analítico de Resiliência Topológica e Simulação de Falhas (What-If Analysis)
 * Executado 100% no cliente (JavaScript puro / Web Worker).
 */

// Lista padrão de ICAOs das 27 Capitais Brasileiras
export const BRAZILIAN_CAPITALS_ICAO = [
  'SBBR', 'SBSP', 'SBRJ', 'SBCF', 'SBSV', 'SBPA', 'SBRF', 'SBFZ', 'SBCT', 
  'SBBE', 'SBGO', 'SBEG', 'SBGL', 'SBNT', 'SBSG', 'SBVT', 'SBMS', 'SBCG', 
  'SBCY', 'SBJP', 'SBTE', 'SBMA', 'SBMO', 'SBBV', 'SBMQ', 'SBPV', 'SBRB', 'SBPJ'
];

/**
 * Constrói lista de adjacência direcionada a partir das rotas ativas.
 */
export function buildAdjacencyList(routes, excludedIcao = null) {
  const adj = new Map(); // icao -> Array<{ dest, dist, flights, pax }>
  const inDegree = new Map();
  const outDegree = new Map();

  routes.forEach(r => {
    if (excludedIcao && (r.orig === excludedIcao || r.dest === excludedIcao)) {
      return;
    }

    if (!adj.has(r.orig)) adj.set(r.orig, []);
    if (!adj.has(r.dest)) adj.set(r.dest, []);

    adj.get(r.orig).push({
      dest: r.dest,
      dist: r.dist_km || 1000,
      flights: r.flights || 0,
      pax: r.pax || 0
    });

    outDegree.set(r.orig, (outDegree.get(r.orig) || 0) + 1);
    inDegree.set(r.dest, (inDegree.get(r.dest) || 0) + 1);
  });

  return { adj, inDegree, outDegree };
}

/**
 * Algoritmo de Dijkstra para encontrar o caminho mais curto entre origem e destino.
 */
export function dijkstraShortestPath(adj, startIcao, targetIcao) {
  if (!adj.has(startIcao) || !adj.has(targetIcao)) {
    return { path: null, distance: Infinity, stops: 0 };
  }

  const distances = new Map();
  const previous = new Map();
  const visited = new Set();
  
  // Fila de prioridade simples (para matrizes de ~300 nós, a busca linear no conjunto é < 1ms)
  const queue = new Set();

  adj.forEach((_, node) => {
    distances.set(node, Infinity);
    queue.add(node);
  });

  distances.set(startIcao, 0);

  while (queue.size > 0) {
    // Extrai nó com menor distância
    let minNode = null;
    let minDist = Infinity;
    queue.forEach(node => {
      const dist = distances.get(node);
      if (dist < minDist) {
        minDist = dist;
        minNode = node;
      }
    });

    if (!minNode || minDist === Infinity) break;
    if (minNode === targetIcao) break;

    queue.delete(minNode);
    visited.add(minNode);

    const neighbors = adj.get(minNode) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.dest)) continue;

      const alt = minDist + edge.dist;
      if (alt < distances.get(edge.dest)) {
        distances.set(edge.dest, alt);
        previous.set(edge.dest, minNode);
      }
    }
  }

  const targetDist = distances.get(targetIcao);
  if (!targetDist || targetDist === Infinity) {
    return { path: null, distance: Infinity, stops: 0 };
  }

  // Reconstrói o caminho
  const path = [];
  let curr = targetIcao;
  while (curr) {
    path.unshift(curr);
    curr = previous.get(curr);
  }

  return {
    path,
    distance: targetDist,
    stops: Math.max(0, path.length - 2)
  };
}

/**
 * Executa a simulação completa de falha topológica por interdição de um aeroporto.
 */
export function simulateNodeInterdiction(routes, airportsMap, closedIcao) {
  if (!closedIcao || !routes || routes.length === 0) {
    return null;
  }

  const closedMeta = airportsMap[closedIcao] || { icao: closedIcao, name: closedIcao, city: 'Desconhecido' };

  // 1. Estatísticas antes do fechamento
  const totalFlights = routes.reduce((acc, r) => acc + (r.flights || 0), 0);
  const totalPax = routes.reduce((acc, r) => acc + (r.pax || 0), 0);

  // 2. Rotas rompidas pelo fechamento
  const disruptedRoutes = routes.filter(r => r.orig === closedIcao || r.dest === closedIcao);
  const survivingRoutes = routes.filter(r => r.orig !== closedIcao && r.dest !== closedIcao);

  const disruptedFlights = disruptedRoutes.reduce((acc, r) => acc + (r.flights || 0), 0);
  const disruptedPax = disruptedRoutes.reduce((acc, r) => acc + (r.pax || 0), 0);
  const paxDisruptionPercent = totalPax > 0 ? (disruptedPax / totalPax) * 100 : 0;
  const flightDisruptionPercent = totalFlights > 0 ? (disruptedFlights / totalFlights) * 100 : 0;

  // 3. Grafos antes e depois
  const baseGraph = buildAdjacencyList(routes, null);
  const failureGraph = buildAdjacencyList(routes, closedIcao);

  // 4. Detecção de Nós Isolados (perderam 100% de conexões com o Brasil)
  const isolatedAirports = [];
  const candidateNodes = new Set();
  disruptedRoutes.forEach(r => {
    if (r.orig !== closedIcao) candidateNodes.add(r.orig);
    if (r.dest !== closedIcao) candidateNodes.add(r.dest);
  });

  candidateNodes.forEach(nodeIcao => {
    const outDeg = failureGraph.outDegree.get(nodeIcao) || 0;
    const inDeg = failureGraph.inDegree.get(nodeIcao) || 0;
    if (outDeg === 0 && inDeg === 0) {
      const meta = airportsMap[nodeIcao];
      isolatedAirports.push({
        icao: nodeIcao,
        name: meta?.name || nodeIcao,
        city: meta?.city || 'Regional',
        state: meta?.state || '',
        is_capital: meta?.is_capital || false
      });
    }
  });

  // 5. Análise de Conectividade entre Capitais
  const activeCapitals = BRAZILIAN_CAPITALS_ICAO.filter(c => 
    c !== closedIcao && airportsMap[c] && (baseGraph.adj.has(c) || failureGraph.adj.has(c))
  );

  let totalCapitalPairs = 0;
  let severedCapitalPairs = [];
  let detourSpikePairs = [];
  let sumDistBefore = 0;
  let countDistBefore = 0;
  let sumDistAfter = 0;
  let countDistAfter = 0;

  const alternateHubUsage = new Map(); // Hub ICAO -> frequência em rotas de contorno

  for (let i = 0; i < activeCapitals.length; i++) {
    for (let j = i + 1; j < activeCapitals.length; j++) {
      const orig = activeCapitals[i];
      const dest = activeCapitals[j];
      totalCapitalPairs++;

      const before = dijkstraShortestPath(baseGraph.adj, orig, dest);
      const after = dijkstraShortestPath(failureGraph.adj, orig, dest);

      if (before.path) {
        sumDistBefore += before.distance;
        countDistBefore++;
      }

      if (before.path && !after.path) {
        // Rota totalmente rompida
        severedCapitalPairs.push({
          orig,
          dest,
          orig_city: airportsMap[orig]?.city || orig,
          dest_city: airportsMap[dest]?.city || dest,
          orig_state: airportsMap[orig]?.state || '',
          dest_state: airportsMap[dest]?.state || '',
          old_path: before.path,
          old_distance: before.distance
        });
      } else if (before.path && after.path) {
        sumDistAfter += after.distance;
        countDistAfter++;

        const distDiff = after.distance - before.distance;
        const detourIncrease = before.distance > 0 ? (after.distance / before.distance) - 1 : 0;

        if (distDiff > 250 || detourIncrease > 0.2) {
          detourSpikePairs.push({
            orig,
            dest,
            orig_city: airportsMap[orig]?.city || orig,
            dest_city: airportsMap[dest]?.city || dest,
            orig_state: airportsMap[orig]?.state || '',
            dest_state: airportsMap[dest]?.state || '',
            old_path: before.path,
            new_path: after.path,
            old_dist: Math.round(before.distance),
            new_dist: Math.round(after.distance),
            increase_km: Math.round(distDiff),
            increase_pct: (detourIncrease * 100).toFixed(0)
          });
        }

        // Contabiliza aeroportos que atuaram como nós de desvio
        if (after.path.length > 2) {
          for (let k = 1; k < after.path.length - 1; k++) {
            const intermediate = after.path[k];
            alternateHubUsage.set(intermediate, (alternateHubUsage.get(intermediate) || 0) + 1);
          }
        }
      }
    }
  }

  // 6. Ranking de Hubs Alternativos Mais Sobrecarregados
  const overloadedHubs = Array.from(alternateHubUsage.entries())
    .map(([icao, detourCount]) => {
      const meta = airportsMap[icao];
      return {
        icao,
        name: meta?.name || icao,
        city: meta?.city || icao,
        state: meta?.state || '',
        detourCount
      };
    })
    .sort((a, b) => b.detourCount - a.detourCount)
    .slice(0, 5);

  const avgDistanceBefore = countDistBefore > 0 ? Math.round(sumDistBefore / countDistBefore) : 0;
  const avgDistanceAfter = countDistAfter > 0 ? Math.round(sumDistAfter / countDistAfter) : 0;

  return {
    closedAirport: closedMeta,
    totalFlights,
    totalPax,
    disruptedFlights,
    disruptedPax,
    flightDisruptionPercent: flightDisruptionPercent.toFixed(1),
    paxDisruptionPercent: paxDisruptionPercent.toFixed(1),
    isolatedAirports,
    severedCapitalPairs,
    detourSpikePairs: detourSpikePairs.sort((a, b) => b.increase_km - a.increase_km).slice(0, 10),
    overloadedHubs,
    avgDistanceBefore,
    avgDistanceAfter,
    distanceIncreasePct: avgDistanceBefore > 0 ? (((avgDistanceAfter - avgDistanceBefore) / avgDistanceBefore) * 100).toFixed(1) : 0,
    disruptedRoutesCount: disruptedRoutes.length,
    survivingRoutesCount: survivingRoutes.length
  };
}
