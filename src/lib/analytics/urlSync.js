/**
 * Sincronizador Bidirecional de Permalinks e Estado na URL (GeoFlight-BR)
 * Caminho: src/lib/analytics/urlSync.js
 */

import { get } from 'svelte/store';
import { 
  selectedYear, 
  minFlightThresholdIndex, 
  onlyDomestic, 
  selectedDistanceBracket,
  selectedAirport, 
  metricMode, 
  theme,
  isRoutePlannerOpen,
  plannedRouteOrigin,
  plannedRouteDest,
  simulatedClosedAirport,
  isResilienceMode,
  shareToastMessage,
  openExclusiveDrawer
} from '$lib/stores/flightState.js';

let isInitialized = false;
let syncTimeout = null;

/**
 * Lê os parâmetros da URL no carregamento inicial da página e hidrata as stores Svelte
 */
export function initUrlSync() {
  if (typeof window === 'undefined' || isInitialized) return;
  isInitialized = true;

  try {
    const params = new URLSearchParams(window.location.search);

    // 1. Ano Selecionado
    const ano = parseInt(params.get('ano') || params.get('year') || '', 10);
    if (!isNaN(ano) && ano >= 2000 && ano <= 2026) {
      selectedYear.set(ano);
    }

    // 2. Limiar de Frequência de Voos (0 a 6)
    const freq = parseInt(params.get('freq') || params.get('frequencia') || '', 10);
    if (!isNaN(freq) && freq >= 0 && freq <= 6) {
      minFlightThresholdIndex.set(freq);
    }

    // 3. Escopo Doméstico
    const dom = params.get('dom') || params.get('domestico');
    if (dom !== null) {
      onlyDomestic.set(dom === '1' || dom === 'true');
    }

    // 4. Extensão de Voo (Distance Bracket)
    const dist = params.get('dist');
    if (dist && ['all', 'short', 'medium', 'long'].includes(dist)) {
      selectedDistanceBracket.set(dist);
    }

    // 5. Métrica de Centralidade
    const metrica = params.get('metrica') || params.get('metric');
    if (metrica && ['flights', 'betweenness', 'degree'].includes(metrica)) {
      metricMode.set(metrica);
    }

    // 5. Tema
    const t = params.get('tema') || params.get('theme');
    if (t && ['dark', 'light'].includes(t)) {
      theme.set(t);
    }

    // 6. Rota Planejada (Origem e Destino)
    const orig = params.get('orig');
    const dest = params.get('dest');
    if (orig && dest) {
      plannedRouteOrigin.set(orig.toUpperCase());
      plannedRouteDest.set(dest.toUpperCase());
      openExclusiveDrawer('routePlanner');
    } else {
      // 7. Aeroporto Focado (Ego-Graph)
      const aeroporto = params.get('aeroporto') || params.get('icao');
      if (aeroporto) {
        selectedAirport.set(aeroporto.toUpperCase());
      }

      // 8. Simulação de Falha
      const falha = params.get('falha');
      if (falha) {
        simulatedClosedAirport.set(falha.toUpperCase());
        openExclusiveDrawer('resilience');
      }
    }
  } catch (err) {
    console.warn('Erro ao restaurar estado a partir dos parâmetros da URL:', err);
  }
}

/**
 * Atualiza os parâmetros na URLSearchParams de forma transparente (sem recarregar página)
 */
export function syncStateToUrl() {
  if (typeof window === 'undefined' || !isInitialized) return;

  if (syncTimeout) clearTimeout(syncTimeout);

  syncTimeout = setTimeout(() => {
    try {
      const params = new URLSearchParams();

      const year = get(selectedYear);
      if (year !== 2024) params.set('ano', year.toString());

      const freq = get(minFlightThresholdIndex);
      if (freq !== 3) params.set('freq', freq.toString());

      const dom = get(onlyDomestic);
      if (!dom) params.set('dom', '0');

      const dist = get(selectedDistanceBracket);
      if (dist && dist !== 'all') params.set('dist', dist);

      const metric = get(metricMode);
      if (metric !== 'flights') params.set('metrica', metric);

      const plannerOpen = get(isRoutePlannerOpen);
      const orig = get(plannedRouteOrigin);
      const dest = get(plannedRouteDest);
      if (plannerOpen && orig && dest) {
        params.set('orig', orig);
        params.set('dest', dest);
      } else {
        const airport = get(selectedAirport);
        if (airport) params.set('aeroporto', airport);

        const closed = get(simulatedClosedAirport);
        const resOpen = get(isResilienceMode);
        if (resOpen && closed) params.set('falha', closed);
      }

      const queryString = params.toString();
      const nextUrl = queryString 
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      if (window.location.search !== (queryString ? `?${queryString}` : '')) {
        window.history.replaceState(null, '', nextUrl);
      }
    } catch (err) {
      console.warn('Erro ao atualizar URLSearchParams:', err);
    }
  }, 350);
}

/**
 * Copia o permalink completo ativo para a área de transferência do usuário e exibe toast de confirmação
 */
export async function copyShareUrl() {
  if (typeof window === 'undefined') return;

  // Garante que o estado mais recente esteja refletido na URL antes de copiar
  const fullUrl = window.location.href;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullUrl);
    } else {
      // Fallback para navegadores legados
      const input = document.createElement('input');
      input.value = fullUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    shareToastMessage.set('Link de visualização copiado para a área de transferência!');
    setTimeout(() => {
      shareToastMessage.set(null);
    }, 3200);
  } catch (err) {
    console.error('Falha ao copiar link:', err);
    shareToastMessage.set('Não foi possível copiar automaticamente. Copie a URL do navegador.');
    setTimeout(() => {
      shareToastMessage.set(null);
    }, 4000);
  }
}
