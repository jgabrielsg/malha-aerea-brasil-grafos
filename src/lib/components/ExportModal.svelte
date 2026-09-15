<script>
  import { 
    isExportModalOpen, 
    selectedYear, 
    minFlightThresholdIndex, 
    onlyDomestic,
    FREQUENCY_LEVELS,
    selectedAirport,
    activePlannedRoute
  } from '$lib/stores/flightState.js';
  import { currentRoutes, rawAirports } from '$lib/stores/dataStore.js';
  import { 
    captureMapSnapshot, 
    exportRoutesToCsv, 
    exportPlannedRouteToCsv 
  } from '$lib/analytics/exportUtils.js';
  import Icon from '$lib/icons/Icon.svelte';

  let isCapturing = $state(false);

  function closeModal() {
    isExportModalOpen.set(false);
  }

  async function handleSnapshot() {
    if (typeof document === 'undefined') return;

    isCapturing = true;
    const mapContainer = document.getElementById('flight-map-container');
    const mapInstance = window.__geoflight_map_instance;

    const freqLevel = FREQUENCY_LEVELS[$minFlightThresholdIndex]?.label || '';
    const domText = $onlyDomestic ? 'Apenas Doméstico' : 'Malha Nacional + Internacional';
    const filterSummary = `Limiar: ${freqLevel} • ${domText}`;

    let focusedDetail = '';
    if ($activePlannedRoute) {
      const p = $activePlannedRoute.path;
      focusedDetail = `Itinerário: ${p[0]} ➔ ${p[p.length - 1]} (${$activePlannedRoute.totalDistanceKm} km)`;
    } else if ($selectedAirport && $rawAirports[$selectedAirport]) {
      const a = $rawAirports[$selectedAirport];
      focusedDetail = `Foco: ${a.icao} (${a.city || a.name})`;
    }

    try {
      await captureMapSnapshot(mapInstance, mapContainer, {
        year: $selectedYear,
        activeRoutesCount: $currentRoutes?.length || 0,
        filtersSummary: filterSummary,
        focusedDetail: focusedDetail
      });
    } finally {
      isCapturing = false;
      closeModal();
    }
  }

  function handleExportRoutes() {
    const freqLevel = FREQUENCY_LEVELS[$minFlightThresholdIndex]?.label || '';
    const domText = $onlyDomestic ? 'Apenas Doméstico' : 'Todas';
    const summary = `Ano ${$selectedYear} • Limiar: ${freqLevel} • ${domText}`;

    exportRoutesToCsv($currentRoutes, $selectedYear, summary);
    closeModal();
  }

  function handleExportItinerary() {
    if ($activePlannedRoute) {
      exportPlannedRouteToCsv($activePlannedRoute, $rawAirports);
      closeModal();
    }
  }
</script>

{#if $isExportModalOpen}
  <div 
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={closeModal}
    onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
  >
    <div 
      class="w-full max-w-md bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden"
      role="none"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Cabeçalho -->
      <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-gray-50 dark:bg-dark-card/50">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
            <Icon name="download" class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white font-mono">
              Exportar Visualizações e Dados
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Capturas de imagem e planilhas formatadas
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={closeModal}
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        >
          <Icon name="x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Opções de Exportação -->
      <div class="p-4 space-y-3">
        <!-- Opção 1: Snapshot PNG do Mapa -->
        <div class="p-3.5 rounded-xl border border-gray-200 dark:border-dark-border hover:border-gov-blue/50 dark:hover:border-dark-accent/50 bg-gray-50/50 dark:bg-dark-card/30 transition-all flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-lg bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent">
                <Icon name="camera" class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-900 dark:text-white">
                  Captura do Mapa (PNG Alta Resolução)
                </h4>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  Imagem do estado atual do mapa com legenda estanque e créditos ANAC
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={isCapturing}
            onclick={handleSnapshot}
            class="w-full mt-1 py-2 px-3 rounded-lg bg-gov-blue hover:bg-gov-blue-dark dark:bg-dark-accent dark:hover:bg-cyan-400 text-white dark:text-dark-bg font-mono font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {#if isCapturing}
              <Icon name="loader2" class="w-3.5 h-3.5 animate-spin" />
              <span>Processando Canvas WebGL...</span>
            {:else}
              <Icon name="camera" class="w-3.5 h-3.5" />
              <span>Gerar Imagem PNG</span>
            {/if}
          </button>
        </div>

        <!-- Opção 2: Exportar Rotas Filtradas em CSV -->
        <div class="p-3.5 rounded-xl border border-gray-200 dark:border-dark-border hover:border-gov-blue/50 dark:hover:border-dark-accent/50 bg-gray-50/50 dark:bg-dark-card/30 transition-all flex flex-col gap-2">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Icon name="download" class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-900 dark:text-white">
                  Planilha de Rotas Ativas (CSV)
                </h4>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  {$currentRoutes?.length || 0} conexões da safra {$selectedYear} com voos e distâncias
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onclick={handleExportRoutes}
            class="w-full mt-1 py-2 px-3 rounded-lg bg-gray-900 hover:bg-black dark:bg-dark-card dark:hover:bg-dark-border text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-2 border border-gray-300 dark:border-dark-border"
          >
            <Icon name="download" class="w-3.5 h-3.5" />
            <span>Baixar CSV ({$selectedYear})</span>
          </button>
        </div>

        <!-- Opção 3: Itinerário Planejado (Se ativo) -->
        {#if $activePlannedRoute}
          <div class="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 transition-all flex flex-col gap-2 animate-fadeIn">
            <div class="flex items-center gap-2.5">
              <div class="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Icon name="route" class="w-4 h-4" />
              </div>
              <div>
                <h4 class="text-xs font-bold text-gray-900 dark:text-white">
                  Itinerário Planejado (CSV)
                </h4>
                <p class="text-[11px] text-gray-500 dark:text-gray-400">
                  {$activePlannedRoute.path[0]} ➔ {$activePlannedRoute.path[$activePlannedRoute.path.length - 1]} ({$activePlannedRoute.hops} escalas)
                </p>
              </div>
            </div>

            <button
              type="button"
              onclick={handleExportItinerary}
              class="w-full mt-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-mono font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="download" class="w-3.5 h-3.5" />
              <span>Baixar Trechos do Itinerário</span>
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out forwards;
  }
</style>
