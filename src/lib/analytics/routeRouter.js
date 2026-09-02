/**
 * Módulo de Busca e Otimização de Rotas Multi-Escala (Route Finder SOTA)
 * 
 * Implementa o algoritmo de Yen (k-Shortest Paths) com penalização de escala (+350 km/escala)
 * em grafos direcionados ponderados, operando 100% no cliente sobre a malha aérea filtrada.
 */

/**
 * Calcula a distância geodésica em quilômetros via fórmula de Haversine.
 */
export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 0;
  }
  const R = 6371; // Raio médio da Terra em km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Retorna uma descrição amigável da cadência de voos anuais.
 * @param {number} flights - Decolagens anuais no trecho
 * @returns {string} ex: "3 voos/dia", "4 voos/sem", "2 voos/mês"
 */
export function formatFlightCadence(flights) {
  if (!flights || flights <= 0) return '0 voos';
  if (flights >= 730) return `~${Math.round(flights / 365)} voos/dia`;
  if (flights >= 300) return `1 voo/dia`;
  if (flights >= 52) {
    const w = Math.round(flights / 52);
    return w === 1 ? '1 voo/sem' : `${w} voos/sem`;
  }
  if (flights >= 12) {
    const m = Math.round(flights / 12);
    return m === 1 ? '1 voo/mês' : `${m} voos/mês`;
  }
  return flights === 1 ? '1 voo/ano' : `${flights} voos/ano`;
}

/**
 * Executa Dijkstra clássico com penalidade de escala (+350 km por salto)
 * para encontrar o caminho ótimo entre dois nós com suporte a arestas e nós excluídos.
 */
function dijkstra(start, target, adj, edgeLookup, excludedEdges = new Set(), excludedNodes = new Set()) {
  const dist = new Map();
  const prev = new Map();
  const visited = new Set();

  dist.set(start, 0);

  while (true) {
    let u = null;
    let bestDist = Infinity;

    for (const [node, d] of dist.entries()) {
      if (!visited.has(node) && d < bestDist) {
        bestDist = d;
        u = node;
      }
    }

    if (u === null || bestDist === Infinity) break;
    if (u === target) break;

    visited.add(u);

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      const v = edge.dest;
      if (visited.has(v) || excludedNodes.has(v)) continue;
      if (excludedEdges.has(`${u}->${v}`)) continue;

      // Penalidade de escala: +350 km em cada salto intermediário
      const weight = (edge.dist_km || 100) + 350;
      const alt = bestDist + weight;

      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
      }
    }
  }

  if (!visited.has(target) && !prev.has(target)) return null;

  const path = [];
  let curr = target;
  while (curr !== undefined) {
    path.unshift(curr);
    curr = prev.get(curr);
  }

  if (path[0] !== start) return null;
  return path;
}

/**
 * Calcula custo real e custo ponderado de um trajeto.
 */
function computePathCost(path, edgeLookup) {
  let realDist = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = edgeLookup.get(`${path[i]}->${path[i+1]}`);
    realDist += edge ? edge.dist_km : 100;
  }
  const hops = Math.max(0, path.length - 2);
  const weightedCost = realDist + 350 * hops;
  return { realDist, hops, weightedCost };
}

/**
 * Calcula os k melhores caminhos simples entre origem e destino
 * utilizando o algoritmo de Yen em conjunto com o subgrafo ativo.
 * 
 * @param {string} originIcao - Código ICAO do aeroporto de partida
 * @param {string} destIcao - Código ICAO do aeroporto de destino
 * @param {Array} filteredRoutes - Lista de rotas ativas (após filtros de ano, frequência e doméstico)
 * @param {Object} airportsMap - Dicionário com metadados dos aeroportos
 * @param {number} k - Número de opções a retornar (padrão 5)
 * @returns {Array} Lista de até k opções de rotas ranqueadas
 */
export function findKShortestPaths(originIcao, destIcao, filteredRoutes, airportsMap, k = 5) {
  if (!originIcao || !destIcao || originIcao === destIcao) return [];
  if (!filteredRoutes || filteredRoutes.length === 0) return [];
  if (!airportsMap) return [];

  // 1. Construção do Subgrafo Ativo
  const adj = new Map();
  const edgeLookup = new Map();

  for (const r of filteredRoutes) {
    if (!r.orig || !r.dest || r.orig === r.dest) continue;
    if (!adj.has(r.orig)) adj.set(r.orig, []);

    const edgeKey = `${r.orig}->${r.dest}`;
    const existing = edgeLookup.get(edgeKey);

    if (!existing) {
      const origAir = airportsMap[r.orig];
      const destAir = airportsMap[r.dest];
      const dist = r.dist_km || (origAir && destAir ? calculateHaversineKm(origAir.lat, origAir.lon, destAir.lat, destAir.lon) : 500);

      const edge = {
        dest: r.dest,
        dist_km: dist,
        flights: r.flights || 0,
        pax: r.pax || 0
      };
      adj.get(r.orig).push(edge);
      edgeLookup.set(edgeKey, edge);
    } else {
      existing.flights += r.flights || 0;
      if (r.pax) existing.pax += r.pax;
    }
  }

  // Verifica se origem possui saídas e destino possui entradas
  if (!adj.has(originIcao)) return [];

  // 2. Busca do Caminho Inicial (A[0])
  const initialPath = dijkstra(originIcao, destIcao, adj, edgeLookup);
  if (!initialPath) return [];

  const A = [initialPath];
  const B = [];
  const BSet = new Set();

  // 3. Algoritmo de Yen para os k-1 caminhos subsequentes
  for (let pathIdx = 1; pathIdx < k; pathIdx++) {
    const prevPath = A[pathIdx - 1];

    for (let i = 0; i < prevPath.length - 1; i++) {
      const spurNode = prevPath[i];
      const rootPath = prevPath.slice(0, i + 1);

      // Remove arestas compartilhadas com rotas anteriores que têm a mesma raiz
      const excludedEdges = new Set();
      for (const p of A) {
        if (p.length > i + 1) {
          let matches = true;
          for (let j = 0; j <= i; j++) {
            if (p[j] !== rootPath[j]) {
              matches = false;
              break;
            }
          }
          if (matches) {
            excludedEdges.add(`${p[i]}->${p[i+1]}`);
          }
        }
      }

      // Evita loops excluindo os nós da raiz (exceto o nó de desvio spurNode)
      const excludedNodes = new Set(rootPath.slice(0, i));

      const spurPath = dijkstra(spurNode, destIcao, adj, edgeLookup, excludedEdges, excludedNodes);
      if (spurPath) {
        const totalPath = rootPath.slice(0, -1).concat(spurPath);
        const pathKey = totalPath.join('->');

        if (!A.some(p => p.join('->') === pathKey) && !BSet.has(pathKey)) {
          BSet.add(pathKey);
          const costInfo = computePathCost(totalPath, edgeLookup);
          B.push({ path: totalPath, ...costInfo });
        }
      }
    }

    if (B.length === 0) break;

    // Critério de desempate:
    // 1. Menor custo ponderado (distância + 350 * escalas)
    // 2. Menor número de escalas
    // 3. Menor distância real percorrida
    B.sort((a, b) => {
      if (Math.abs(a.weightedCost - b.weightedCost) > 0.1) return a.weightedCost - b.weightedCost;
      if (a.hops !== b.hops) return a.hops - b.hops;
      return a.realDist - b.realDist;
    });

    const bestCandidate = B.shift();
    BSet.delete(bestCandidate.path.join('->'));
    A.push(bestCandidate.path);
  }

  // 4. Enriquecimento de Métricas e Análise de Elo Crítico
  const origAir = airportsMap[originIcao];
  const destAir = airportsMap[destIcao];
  const directDistanceKm = (origAir && destAir)
    ? calculateHaversineKm(origAir.lat, origAir.lon, destAir.lat, destAir.lon)
    : 0;

  return A.map((pathNodes, index) => {
    const segments = [];
    let totalDistanceKm = 0;
    let bottleneckFlights = Infinity;
    let bottleneckSegment = null;

    for (let i = 0; i < pathNodes.length - 1; i++) {
      const u = pathNodes[i];
      const v = pathNodes[i+1];
      const edge = edgeLookup.get(`${u}->${v}`) || { dist_km: 0, flights: 0 };
      const dist = Math.round(edge.dist_km * 10) / 10;
      const fl = edge.flights || 0;

      const segment = {
        orig: u,
        dest: v,
        origName: airportsMap[u]?.name || u,
        origCity: airportsMap[u]?.city || u,
        origState: airportsMap[u]?.state || airportsMap[u]?.country || '',
        destName: airportsMap[v]?.name || v,
        destCity: airportsMap[v]?.city || v,
        destState: airportsMap[v]?.state || airportsMap[v]?.country || '',
        dist_km: dist,
        flights: fl,
        cadenceLabel: formatFlightCadence(fl)
      };

      segments.push(segment);
      totalDistanceKm += dist;

      if (fl < bottleneckFlights) {
        bottleneckFlights = fl;
        bottleneckSegment = segment;
      }
    }

    const hops = Math.max(0, pathNodes.length - 2);
    const detourRatio = directDistanceKm > 0 
      ? Number((totalDistanceKm / directDistanceKm).toFixed(2)) 
      : 1.0;

    return {
      id: `route-${index}-${pathNodes.join('-')}`,
      index,
      rank: index + 1,
      isOptimal: index === 0,
      hops,
      path: pathNodes,
      segments,
      totalDistanceKm: Math.round(totalDistanceKm),
      directDistanceKm: Math.round(directDistanceKm),
      detourRatio,
      bottleneckFlights: bottleneckFlights === Infinity ? 0 : bottleneckFlights,
      bottleneckSegment,
      weightedCost: Math.round(totalDistanceKm + 350 * hops)
    };
  });
}

/**
 * Diagnóstico inteligente para quando não há rotas no filtro corrente:
 * Verifica em qual limiar inferior de frequência uma rota se torna viável.
 * 
 * @param {string} originIcao 
 * @param {string} destIcao 
 * @param {Array} rawYearRoutes - Todas as rotas do ano (sem filtro de frequência)
 * @param {Object} airportsMap 
 * @param {Array} frequencyLevels - Níveis de frequência
 * @param {number} currentThresholdIdx - Índice ativo do limiar
 * @returns {Object|null}
 */
export function checkRouteFeasibilitySuggestion(originIcao, destIcao, rawYearRoutes, airportsMap, frequencyLevels, currentThresholdIdx) {
  if (!originIcao || !destIcao || currentThresholdIdx === 0) return null;
  if (!rawYearRoutes || rawYearRoutes.length === 0) return null;

  // Testa limiares inferiores (do mais próximo ao mais permissivo)
  for (let idx = currentThresholdIdx - 1; idx >= 0; idx--) {
    const minFlights = frequencyLevels[idx].min;
    const testRoutes = rawYearRoutes.filter(r => {
      const orig = airportsMap[r.orig];
      const dest = airportsMap[r.dest];
      return orig && dest && (r.flights || 0) >= minFlights;
    });

    const paths = findKShortestPaths(originIcao, destIcao, testRoutes, airportsMap, 1);
    if (paths.length > 0) {
      return {
        viableLevel: frequencyLevels[idx],
        viableIndex: idx,
        currentLevel: frequencyLevels[currentThresholdIdx]
      };
    }
  }

  return null;
}
