<script>
  import { currentGapsData } from '$lib/stores/dataStore.js';
  import { selectedGap, selectedAirport, selectedYear, cameraTarget } from '$lib/stores/flightState.js';
  import { rawAirports } from '$lib/stores/dataStore.js';
  import { 
    AlertTriangle, 
    X, 
    ArrowRight, 
    Compass, 
    Route, 
    Sparkles, 
    CornerDownRight, 
    Navigation 
  } from '@lucide/svelte';

  let { isOpen = $bindable(false) } = $props();

  let searchFilter = $state('');

  let disconnectedGaps = $derived($currentGapsData.gaps || []);

  let filteredGaps = $derived(
    searchFilter.trim()
      ? disconnectedGaps.filter(g => {
          const q = searchFilter.trim().toLowerCase();
          return (
            g.orig_city.toLowerCase().includes(q) ||
            g.dest_city.toLowerCase().includes(q) ||
            g.orig_state.toLowerCase().includes(q) ||
            g.dest_state.toLowerCase().includes(q) ||
            g.orig_icao.toLowerCase().includes(q) ||
            g.dest_icao.toLowerCase().includes(q)
          );
        })
      : disconnectedGaps
  );

  function selectGap(gap) {
    selectedAirport.set(null);
    selectedGap.set(gap);
    
    // Centraliza a câmera no ponto médio da rota
    const origMeta = $rawAirports[gap.orig_icao];
    const destMeta = $rawAirports[gap.dest_icao];
    if (origMeta && destMeta) {
      const midLon = (origMeta.lon + destMeta.lon) / 2;
      const midLat = (origMeta.lat + destMeta.lat) / 2;
      cameraTarget.set([midLon, midLat, 4.8]);
    }
  }

  function clearGap() {
    selectedGap.set(null);
  }
</script>

<!-- Botão / Card Disparador no Mapa -->
{#if !isOpen}
  <button
    type="button"
    onclick={() => isOpen = true}
    class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-dark-surface/95 backdrop-blur border border-gray-200 dark:border-dark-border shadow-lg text-xs hover:border-amber-500/50 transition-all text-left group"
  >
    <div class="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
      <AlertTriangle class="w-4 h-4" />
    </div>
    <div>
      <div class="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
        <span>Desertos de Rota</span>
        <span class="font-mono text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
          {$currentGapsData.capital_gap_percentage}%
        </span>
      </div>
      <p class="text-[11px] text-gray-500 dark:text-gray-400">
        {$currentGapsData.capital_pairs_disconnected || 0} pares de capitais sem voo direto
      </p>
    </div>
  </button>
{/if}

<!-- Modal / Drawer Lateral do Inspetor -->
{#if isOpen}
  <div class="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white/98 dark:bg-dark-surface/98 backdrop-blur-md border-l border-gray-200 dark:border-dark-border shadow-2xl z-50 flex flex-col transition-all">
    <!-- Cabeçalho -->
    <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-start justify-between gap-3 bg-amber-500/5">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-md bg-amber-500/20 text-amber-500 flex items-center justify-center">
            <Route class="w-3.5 h-3.5" />
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">
            Inspetor de Desertos de Rota ({$selectedYear})
          </h2>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Pares de capitais brasileiras sem voo direto e seus caminhos mínimos de conexão.
        </p>
      </div>

      <button
        type="button"
        onclick={() => isOpen = false}
        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Estatísticas de Conectividade do Ano -->
    <div class="p-4 bg-gray-50 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border flex items-center justify-between text-xs font-mono">
      <div>
        <span class="text-gray-500 dark:text-gray-400 block text-[10px] uppercase">Capitais Desconectadas</span>
        <span class="text-base font-bold text-amber-500">
          {$currentGapsData.capital_pairs_disconnected || 0} / {$currentGapsData.capital_pairs_total || 351}
        </span>
      </div>
      <div class="text-right">
        <span class="text-gray-500 dark:text-gray-400 block text-[10px] uppercase">Taxa de Isolamento Direto</span>
        <span class="text-base font-bold text-gray-900 dark:text-white">
          {$currentGapsData.capital_gap_percentage}%
        </span>
      </div>
    </div>

    <!-- Campo de Busca de Pares -->
    <div class="p-3 border-b border-gray-200 dark:border-dark-border">
      <input
        type="text"
        bind:value={searchFilter}
        placeholder="Filtrar por capital, estado ou ICAO (ex: Boa Vista, Macapá)..."
        class="w-full px-3 py-1.5 text-xs bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
      />
    </div>

    <!-- Lista de Pares Desconectados -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      {#each filteredGaps as gap}
        {@const isSelected = $selectedGap?.orig_icao === gap.orig_icao && $selectedGap?.dest_icao === gap.dest_icao}
        <button
          type="button"
          onclick={() => selectGap(gap)}
          class="w-full text-left p-3 rounded-xl border transition-all text-xs {isSelected ? 'bg-amber-500/10 border-amber-500/50 shadow-md' : 'bg-gray-50 dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-dark-border/40 border-gray-200 dark:border-dark-border'}"
        >
          <!-- Cidades do Par -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white truncate">
              <span>{gap.orig_city} ({gap.orig_state})</span>
              <ArrowRight class="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span>{gap.dest_city} ({gap.dest_state})</span>
            </div>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold flex-shrink-0">
              +{gap.detour_ratio ? `${((gap.detour_ratio - 1) * 100).toFixed(0)}% desvio` : 'Sem rota'}
            </span>
          </div>

          <!-- Traçado do Caminho Ótimo com Conexões -->
          {#if gap.path && gap.path.length > 2}
            <div class="p-2 rounded-lg bg-white dark:bg-dark-surface border border-gray-200/60 dark:border-dark-border/60 font-mono text-[11px] space-y-1">
              <div class="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <CornerDownRight class="w-3 h-3 text-amber-500" />
                <span class="font-semibold text-gray-700 dark:text-gray-300">
                  Rota com {gap.stops} {gap.stops === 1 ? 'escala' : 'escalas'}:
                </span>
              </div>
              <div class="text-gov-blue dark:text-dark-accent font-bold pl-4">
                {gap.path.join(' ➔ ')}
              </div>
              <div class="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 pt-1 border-t border-gray-100 dark:border-dark-border/40">
                <span>Direto: {Math.round(gap.direct_dist_km)} km</span>
                <span class="text-amber-500 font-bold">Com conexões: {Math.round(gap.path_dist_km)} km</span>
              </div>
            </div>
          {:else}
            <p class="text-[11px] text-red-500 font-mono">
              Inacessível na malha deste ano.
            </p>
          {/if}
        </button>
      {/each}

      {#if filteredGaps.length === 0}
        <p class="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
          Nenhum par de capitais encontrado para o filtro aplicado.
        </p>
      {/if}
    </div>

    <!-- Rodapé com Ação de Limpeza -->
    {#if $selectedGap}
      <div class="p-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card flex justify-between items-center text-xs">
        <span class="text-amber-500 font-medium">● Rota destacada no mapa</span>
        <button
          type="button"
          onclick={clearGap}
          class="px-2.5 py-1 rounded-md bg-gray-200 dark:bg-dark-surface hover:bg-gray-300 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 font-medium transition-colors"
        >
          Limpar Destaque
        </button>
      </div>
    {/if}
  </div>
{/if}
