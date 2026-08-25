<script>
  import { selectedAirport, selectedYear, cameraTarget } from '$lib/stores/flightState.js';
  import { selectedAirportDetails, rawAirports } from '$lib/stores/dataStore.js';
  import Icon from '$lib/icons/Icon.svelte';

  function closePanel() {
    selectedAirport.set(null);
  }

  function focusDestination(destIcao) {
    const destAirport = $rawAirports[destIcao];
    if (destAirport) {
      cameraTarget.set([destAirport.lon, destAirport.lat, 7.5]);
      selectedAirport.set(destIcao);
    }
  }
</script>

{#if $selectedAirportDetails}
  <aside class="w-full sm:w-96 bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-l border-gray-200 dark:border-dark-border shadow-2xl flex flex-col h-full z-40 transition-all overflow-hidden">
    <!-- Cabeçalho do Aeroporto -->
    <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-start justify-between gap-3 bg-gradient-to-b from-gov-blue/5 dark:from-dark-accent/5 to-transparent">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-lg font-mono font-extrabold text-gov-blue dark:text-dark-accent tracking-tight">
            {$selectedAirportDetails.icao}
          </span>
          {#if $selectedAirportDetails.iata}
            <span class="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border">
              {$selectedAirportDetails.iata}
            </span>
          {/if}
          {#if $selectedAirportDetails.is_capital}
            <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              CAPITAL
            </span>
          {/if}
        </div>
        <h2 class="text-sm font-bold text-gray-900 dark:text-white truncate">
          {$selectedAirportDetails.name}
        </h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
          <Icon name="mapPin" class="w-3 h-3 flex-shrink-0" />
          <span>{$selectedAirportDetails.city || 'Desconhecido'}, {$selectedAirportDetails.state || $selectedAirportDetails.country}</span>
        </p>
      </div>

      <button
        type="button"
        onclick={closePanel}
        class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors flex-shrink-0"
        title="Fechar Painel e Restaurar Visão Global"
      >
        <Icon name="x" class="w-5 h-5" />
      </button>
    </div>

    <!-- Conteúdo Scrollável -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Indicadores de Centralidade do Ano Corrente -->
      <div class="space-y-2">
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono">
          <span>Métricas de Grafo ({$selectedYear})</span>
          <span class="text-emerald-500 font-bold">● Modo Ego-Graph Ativo</span>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <!-- Total de Voos (Strength) -->
          <div class="p-3 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border">
            <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Icon name="activity" class="w-3.5 h-3.5 text-amber-500" />
              <span>Volume Anual</span>
            </div>
            <p class="text-base sm:text-lg font-mono font-bold text-gray-900 dark:text-white">
              {$selectedAirportDetails.metrics.strength.toLocaleString('pt-BR')}
            </p>
            <span class="text-[10px] text-gray-400 dark:text-gray-500">
              {$selectedAirportDetails.metrics.out_flights.toLocaleString('pt-BR')} partidas
            </span>
          </div>

          <!-- Conexões Diretas (Degree) -->
          <div class="p-3 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border">
            <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Icon name="share2" class="w-3.5 h-3.5 text-gov-blue dark:text-dark-accent" />
              <span>Destinos Diretos</span>
            </div>
            <p class="text-base sm:text-lg font-mono font-bold text-gray-900 dark:text-white">
              {$selectedAirportDetails.metrics.degree}
            </p>
            <span class="text-[10px] text-gray-400 dark:text-gray-500">
              grau de conectividade
            </span>
          </div>
        </div>

        <!-- Centralidade de Intermediação (Betweenness) -->
        <div class="p-3 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border">
          <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
            <div class="flex items-center gap-1.5">
              <Icon name="trendingUp" class="w-3.5 h-3.5 text-emerald-500" />
              <span>Centralidade de Intermediação (Betweenness)</span>
            </div>
            <span class="font-mono font-bold text-gray-900 dark:text-white">
              {($selectedAirportDetails.metrics.betweenness_norm * 100).toFixed(1)}%
            </span>
          </div>
          <!-- Barra de Progresso de Centralidade -->
          <div class="w-full h-1.5 bg-gray-200 dark:bg-dark-surface rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-gov-blue to-emerald-500 rounded-full transition-all duration-500"
              style="width: {Math.min(100, Math.max(2, $selectedAirportDetails.metrics.betweenness_norm * 100))}%"
            ></div>
          </div>
          <p class="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">
            Mede a importância do aeroporto como ponto de conexão e transferência na malha aérea nacional.
          </p>
        </div>
      </div>

      <!-- Informações Geográficas -->
      <div class="p-3 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border space-y-1.5 text-xs">
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Coordenadas:</span>
          <span class="font-mono font-medium text-gray-900 dark:text-white">
            {$selectedAirportDetails.lat.toFixed(4)}°, {$selectedAirportDetails.lon.toFixed(4)}°
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Elevação:</span>
          <span class="font-mono font-medium text-gray-900 dark:text-white">
            {$selectedAirportDetails.elevation} ft ({Math.round($selectedAirportDetails.elevation * 0.3048)} m)
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500 dark:text-gray-400">Fuso Horário:</span>
          <span class="font-mono font-medium text-gray-900 dark:text-white">
            {$selectedAirportDetails.tz}
          </span>
        </div>
      </div>

      <!-- Top 10 Destinos Diretos -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-mono flex items-center justify-between">
          <span>Top 10 Destinos Diretos ({$selectedYear})</span>
          <span class="text-[10px] text-gray-400 lowercase font-normal">clique para focar</span>
        </h3>

        {#if $selectedAirportDetails.metrics.top_destinations && $selectedAirportDetails.metrics.top_destinations.length > 0}
          <div class="space-y-1">
            {#each $selectedAirportDetails.metrics.top_destinations as dest, idx}
              {@const destMeta = $rawAirports[dest.dest]}
              <button
                type="button"
                onclick={() => focusDestination(dest.dest)}
                class="w-full text-left p-2 rounded-lg bg-gray-50 dark:bg-dark-card hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 border border-gray-100 dark:border-dark-border flex items-center justify-between gap-2 text-xs transition-colors group"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="font-mono text-gray-400 dark:text-gray-500 w-4 text-right flex-shrink-0">
                    {idx + 1}.
                  </span>
                  <div class="truncate">
                    <span class="font-mono font-bold text-gray-900 dark:text-white group-hover:text-gov-blue dark:group-hover:text-dark-accent">
                      {dest.dest}
                    </span>
                    {#if destMeta?.city}
                      <span class="text-gray-500 dark:text-gray-400 truncate ml-1 text-[11px]">
                        ({destMeta.city})
                      </span>
                    {/if}
                  </div>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
                  <span class="text-gray-500 dark:text-gray-400">
                    {dest.dist_km ? `${Math.round(dest.dist_km)} km` : ''}
                  </span>
                  <span class="font-bold text-gov-blue dark:text-dark-accent">
                    {dest.flights.toLocaleString('pt-BR')} v.
                  </span>
                  <Icon name="arrowUpRight" class="w-3.5 h-3.5 text-gray-400 group-hover:text-gov-blue dark:group-hover:text-dark-accent" />
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <p class="text-xs text-gray-400 dark:text-gray-500 py-3 text-center">
            Nenhum voo direto registrado a partir deste aeroporto em {$selectedYear}.
          </p>
        {/if}
      </div>
    </div>
  </aside>
{/if}
