<script>
  import { topTenRoutes, rawAirports } from '$lib/stores/dataStore.js';
  import { 
    isTopRoutesOpen, 
    selectedYear, 
    selectedAirport,
    cameraTarget, 
    openExclusiveDrawer,
    closeAllDrawers 
  } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  let selectedRouteKey = $state(null);

  function focusRoute(route) {
    selectedRouteKey = `${route.orig}-${route.dest}`;
    selectedAirport.set(route.orig);

    const origAir = $rawAirports[route.orig];
    const destAir = $rawAirports[route.dest];

    if (origAir && destAir) {
      const midLon = (origAir.lon + destAir.lon) / 2;
      const midLat = (origAir.lat + destAir.lat) / 2;
      cameraTarget.set([midLon, midLat, 6.0, 36, 0]);
    }
  }

  function handleOpen() {
    openExclusiveDrawer('topRoutes');
  }

  function handleClose() {
    isTopRoutesOpen.set(false);
  }
</script>

<!-- Botão / Card Disparador no Mapa -->
{#if !$isTopRoutesOpen}
  <button
    type="button"
    onclick={handleOpen}
    class="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 dark:bg-dark-surface/95 backdrop-blur border border-gray-200 dark:border-dark-border shadow-md hover:shadow-lg text-xs hover:border-gov-blue/50 dark:hover:border-dark-accent/50 transition-all text-left group"
    title="Exibir ranking das 10 conexões mais voadas no ano"
  >
    <div class="w-7 h-7 rounded-lg bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent border border-gov-blue/20 dark:border-dark-accent/30 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
      <Icon name="activity" class="w-4 h-4" />
    </div>
    <div>
      <div class="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
        <span>Top 10 Rotas</span>
        <span class="font-mono text-[10px] px-1 py-0.2 rounded bg-gov-blue/15 dark:bg-dark-accent/20 text-gov-blue dark:text-dark-accent font-bold">
          {$selectedYear}
        </span>
      </div>
      <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
        {#if $topTenRoutes.length > 0}
          #1 {$topTenRoutes[0].orig} ➔ {$topTenRoutes[0].dest}
        {:else}
          Ver corredores
        {/if}
      </p>
    </div>
  </button>
{/if}

<!-- Drawer Lateral do Top 10 Rotas -->
{#if $isTopRoutesOpen}
  <div class="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white/98 dark:bg-dark-surface/98 backdrop-blur-md border-l border-gray-200 dark:border-dark-border shadow-2xl z-50 flex flex-col transition-all">
    <!-- Cabeçalho -->
    <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-start justify-between gap-3 bg-gov-blue/5 dark:bg-dark-accent/5">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <div class="w-6 h-6 rounded-md bg-gov-blue/20 dark:bg-dark-accent/20 text-gov-blue dark:text-dark-accent flex items-center justify-center">
            <Icon name="activity" class="w-3.5 h-3.5" />
          </div>
          <h2 class="text-sm font-bold text-gray-900 dark:text-white">
            Top 10 Rotas Mais Voadas ({$selectedYear})
          </h2>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Corredores com maior densidade operacional registrada nos microdados da ANAC.
        </p>
      </div>

      <button
        type="button"
        onclick={handleClose}
        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        title="Fechar ranking"
      >
        <Icon name="x" class="w-5 h-5" />
      </button>
    </div>

    <!-- Lista do Ranking -->
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      {#if $topTenRoutes.length === 0}
        <div class="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Nenhuma rota encontrada sob os filtros ativos. Reduza o limiar de frequência para ver o ranking.
        </div>
      {:else}
        {#each $topTenRoutes as route}
          {@const isSelected = selectedRouteKey === `${route.orig}-${route.dest}`}
          <button
            type="button"
            onclick={() => focusRoute(route)}
            class="w-full text-left p-3 rounded-xl border transition-all text-xs {isSelected ? 'bg-gov-blue/10 dark:bg-dark-accent/15 border-gov-blue dark:border-dark-accent shadow-md ring-1 ring-gov-blue/30 dark:ring-dark-accent/30' : 'bg-gray-50 dark:bg-dark-card hover:bg-gray-100 dark:hover:bg-dark-border/40 border-gray-200 dark:border-dark-border'}"
          >
            <div class="flex items-center justify-between gap-2 mb-2">
              <div class="flex items-center gap-2 min-w-0">
                <!-- Posição do Ranking -->
                <span class="w-5 h-5 rounded-full flex items-center justify-center font-mono font-bold text-[11px] {route.rank === 1 ? 'bg-amber-400 text-amber-950 font-black' : route.rank === 2 ? 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white' : route.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-200 dark:bg-dark-surface text-gray-700 dark:text-gray-300'}">
                  {route.rank}
                </span>

                <!-- Par de ICAO -->
                <span class="font-mono font-bold text-gray-900 dark:text-white text-xs">
                  {route.orig} ➔ {route.dest}
                </span>
              </div>

              <!-- Distância -->
              {#if route.dist_km}
                <span class="text-[10px] font-mono text-gray-500 dark:text-gray-400">
                  {Math.round(route.dist_km).toLocaleString('pt-BR')} km
                </span>
              {/if}
            </div>

            <!-- Cidades Origem e Destino -->
            <div class="text-[11px] text-gray-600 dark:text-gray-300 truncate mb-2">
              {route.origCity} ({route.origState}) ➔ {route.destCity} ({route.destState})
            </div>

            <!-- Métricas de Tráfego -->
            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-gray-200/60 dark:border-dark-border/60 text-[10px] font-mono">
              <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                <Icon name="plane" class="w-3 h-3 text-gov-blue dark:text-dark-accent -rotate-45" />
                <span><b>{(route.flights || 0).toLocaleString('pt-BR')}</b> decolagens</span>
              </div>
              <div class="flex items-center gap-1 text-gray-700 dark:text-gray-300 justify-end">
                <Icon name="activity" class="w-3 h-3 text-emerald-500" />
                <span><b>{((route.pax || 0) / 1000).toFixed(0)}k</b> passageiros</span>
              </div>
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
{/if}