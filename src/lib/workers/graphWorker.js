/**
 * Web Worker dedicado para computação off-thread de algoritmos em grafos e resiliência.
 * Evita qualquer travamento ou queda de FPS na thread principal de renderização WebGL.
 */

import { simulateNodeInterdiction, dijkstraShortestPath, buildAdjacencyList } from '../analytics/resilienceSimulator.js';

self.onmessage = function (e) {
  const { action, payload, requestId } = e.data;

  if (action === 'SIMULATE_FAILURE') {
    const { routes, airportsMap, closedIcao } = payload;
    try {
      const results = simulateNodeInterdiction(routes, airportsMap, closedIcao);
      self.postMessage({
        type: 'FAILURE_SIMULATION_SUCCESS',
        requestId,
        data: results
      });
    } catch (err) {
      self.postMessage({
        type: 'FAILURE_SIMULATION_ERROR',
        requestId,
        error: err.message
      });
    }
  } else if (action === 'COMPUTE_PATH') {
    const { routes, startIcao, targetIcao, excludedIcao } = payload;
    try {
      const graph = buildAdjacencyList(routes, excludedIcao);
      const result = dijkstraShortestPath(graph.adj, startIcao, targetIcao);
      self.postMessage({
        type: 'COMPUTE_PATH_SUCCESS',
        requestId,
        data: result
      });
    } catch (err) {
      self.postMessage({
        type: 'COMPUTE_PATH_ERROR',
        requestId,
        error: err.message
      });
    }
  }
};
