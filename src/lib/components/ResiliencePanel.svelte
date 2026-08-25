<script>
  import { onMount } from 'svelte';
  import { 
    isResilienceMode, 
    simulatedClosedAirport, 
    resilienceResults, 
    selectedYear,
    cameraTarget 
  } from '$lib/stores/flightState.js';
  import { currentRoutes, rawAirports } from '$lib/stores/dataStore.js';
  import { simulateNodeInterdiction } from '$lib/analytics/resilienceSimulator.js';
  import Icon from '$lib/icons/Icon.svelte';

  let worker = null;
  let isComputing = $state(false);

  const QUICK_SIMULATION_TARGETS = [
    { icao: 'SBGR', label: 'Guarulhos (SP)' },
    { icao: 'SBBR', label: 'Brasília (DF)' },
    { icao: 'SBEG', label: 'Manaus (AM)' },
    { icao: 'SBCF', label: 'Confins (MG)' },
    { icao: 'SBSV', label: 'Salvador (BA)' },
    { icao: 'SBPA', label: 'Porto Alegre (RS)' }
  ];

  function runSimulation(targetIcao) {
    if (!targetIcao || !$currentRoutes || $currentRoutes.length === 0) {
      resilienceResults.set(null);
      return;
    }

    isComputing = true;
    simulatedClosedAirport.set(targetIcao);

    // Foca câmera no aeroporto interditado
    const air = $rawAirports[targetIcao];
    if (air) {
      cameraTarget.set([air.lon, air.lat, 5.5, 42, 0]);
    }

    // Executa simulação com fallback direto caso Web Worker não esteja disponível
    if (typeof Worker !== 'undefined' && worker) {
      worker.postMessage({
        action: 'SIMULATE_FAILURE',
        payload: {
          routes: $currentRoutes,
          airportsMap: $rawAirports,
          closedIcao: targetIcao
        }
      });
    } else {
      setTimeout(() => {
        const results = simulateNodeInterdiction($currentRoutes, $rawAirports, targetIcao);
        resilienceResults.set(results);
        isComputing = false;
      }, 10);
    }
  }

  function clearSimulation() {
    simulatedClosedAirport.set(null);
    resilienceResults.set(null);
  }

  function closePanel() {
    isResilienceMode.set(false);
    clearSimulation();
  }

  onMount(() => {
    // Inicialização do Web Worker
    try {
      worker = new Worker(new URL('../workers/graphWorker.js', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'FAILURE_SIMULATION_SUCCESS') {
          resilienceResults.set(e.data.data);
          isComputing = false;
        } else if (e.data.type === 'FAILURE_SIMULATION_ERROR') {
          console.error('Erro na simulação do Worker:', e.data.error);
          isComputing = false;
        }
      };
    } catch (e) {
      console.warn('Web Worker não pôde ser inicializado, utilizando fallback main-thread:', e);
    }

    // Se abrir sem alvo selecionado, inicia com SBGR por padrão
    if (!$simulatedClosedAirport) {
      runSimulation('SBGR');
    }
  });

  // Reage à mudança de ano ou aeroporto
  $effect(() => {
    if ($simulatedClosedAirport && $currentRoutes) {
      runSimulation($simulatedClosedAirport);
    }
  });
</script>

<aside class="w-full sm:w-[460px] bg-white/98 dark:bg-dark-surface/98 backdrop-blur-md border-l border-gray-200 dark:border-dark-border shadow-2xl z-40 flex flex-col h-full transition-all overflow-hidden">
  <!-- Cabeçalho do Simulador -->
  <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-start justify-between gap-3 bg-gradient-to-r from-red-500/10 via-amber-500/5 to-transparent">
    <div class="min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-6 h-6 rounded-md bg-red-500/20 text-red-500 flex items-center justify-center">
          <Icon name="shieldAlert" class="w-4 h-4" />
        </div>
        <h2 class="text-sm font-bold text-gray-900 dark:text-white">
          Simulador de Resiliência & Falhas
        </h2>
        <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30">
          WHAT-IF
        </span>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        Simule o colapso de nós estratégicos e avalie o impacto na malha nacional ({$selectedYear}).
      </p>
    </div>

    <button
      type="button"
      onclick={closePanel}
      class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
      title="Fechar Simulador de Resiliência"
    >
      <Icon name="x" class="w-5 h-5" />
    </button>
  </div>

  <!-- Seleção Rápida de Alvo de Interdição -->
  <div class="p-3 bg-gray-50 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
    <div class="block text-[11px] font-mono uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-bold">
      Selecione o Nó para Interdição Total:
    </div>
    <div class="grid grid-cols-3 gap-1.5">
      {#each QUICK_SIMULATION_TARGETS as target}
        {@const isSelected = $simulatedClosedAirport === target.icao}
        <button
          type="button"
          onclick={() => runSimulation(target.icao)}
          class="px-2 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all text-center truncate {isSelected ? 'bg-red-500 text-white border-red-600 shadow-sm font-bold' : 'bg-white dark:bg-dark-surface hover:bg-red-500/10 border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300'}"
        >
          {target.icao} ({target.label.split(' ')[0]})
        </button>
      {/each}
    </div>
  </div>

  <!-- Conteúdo dos Resultados da Simulação -->
  <div class="flex-1 overflow-y-auto p-4 space-y-4">
    {#if isComputing}
      <div class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 text-xs">
        <Icon name="loader2" class="w-6 h-6 animate-spin text-red-500 mb-2" />
        <span>Recalculando matriz de caminhos mínimos e isolamento...</span>
      </div>
    {:else if $resilienceResults}
      <!-- Resumo do Impacto Global -->
      <div class="p-3.5 rounded-xl bg-red-500/5 border border-red-500/20 space-y-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-base font-mono font-extrabold text-red-600 dark:text-red-400">
              {$resilienceResults.closedAirport.icao}
            </span>
            <span class="text-xs font-semibold text-gray-900 dark:text-white">
              {$resilienceResults.closedAirport.city || $resilienceResults.closedAirport.name}
            </span>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500 text-white font-bold">
            INTERDITADO
          </span>
        </div>

        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <div class="p-2 rounded-lg bg-white dark:bg-dark-card border border-red-500/20">
            <span class="text-gray-400 text-[10px] block">Passageiros Afetados</span>
            <span class="text-base font-bold text-red-500">
              {$resilienceResults.paxDisruptionPercent}%
            </span>
            <span class="text-[10px] text-gray-400 block">
              {$resilienceResults.disruptedPax.toLocaleString('pt-BR')} pax
            </span>
          </div>

          <div class="p-2 rounded-lg bg-white dark:bg-dark-card border border-red-500/20">
            <span class="text-gray-400 text-[10px] block">Voos Descontinuados</span>
            <span class="text-base font-bold text-red-500">
              {$resilienceResults.flightDisruptionPercent}%
            </span>
            <span class="text-[10px] text-gray-400 block">
              {$resilienceResults.disruptedFlights.toLocaleString('pt-BR')} voos
            </span>
          </div>
        </div>

        <!-- Variação na Distância Média -->
        <div class="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border font-mono">
          <div class="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Icon name="trendingUp" class="w-3.5 h-3.5 text-amber-500" />
            <span>Distância Média de Capitais:</span>
          </div>
          <span class="font-bold text-amber-500">
            {$resilienceResults.avgDistanceBefore} ➔ {$resilienceResults.avgDistanceAfter} km (+{$resilienceResults.distanceIncreasePct}%)
          </span>
        </div>
      </div>

      <!-- Aeroportos que Ficam Totalmente Isolados -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-mono flex items-center justify-between">
          <span class="flex items-center gap-1">
            <Icon name="zapOff" class="w-3.5 h-3.5 text-red-500" />
            <span>Nós 100% Isolados ({$resilienceResults.isolatedAirports.length})</span>
          </span>
          <span class="text-[10px] text-red-500 font-normal">perda total de conexões</span>
        </h3>

        {#if $resilienceResults.isolatedAirports.length > 0}
          <div class="grid grid-cols-2 gap-1.5">
            {#each $resilienceResults.isolatedAirports as air}
              <div class="p-2 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs">
                <div class="truncate">
                  <span class="font-mono font-bold text-red-600 dark:text-red-400">{air.icao}</span>
                  <span class="text-[11px] text-gray-600 dark:text-gray-300 ml-1 truncate">({air.city})</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p class="text-xs text-gray-400 dark:text-gray-500 p-2 text-center rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border">
            Nenhum aeródromo teve isolamento total (possuem rotas alternativas).
          </p>
        {/if}
      </div>

      <!-- Ranking de Hubs Mais Sobrecarregados pelo Desvio -->
      <div>
        <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-mono flex items-center justify-between">
          <span class="flex items-center gap-1">
            <Icon name="activity" class="w-3.5 h-3.5 text-amber-500" />
            <span>Hubs Mais Sobrecarregados pelo Desvio</span>
          </span>
        </h3>

        <div class="space-y-1.5">
          {#each $resilienceResults.overloadedHubs as hub, idx}
            <div class="p-2.5 rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="font-mono text-gray-400 w-4 text-right">{idx + 1}.</span>
                <div>
                  <span class="font-mono font-bold text-gov-blue dark:text-dark-accent">{hub.icao}</span>
                  <span class="text-gray-600 dark:text-gray-400 ml-1">({hub.city})</span>
                </div>
              </div>
              <span class="font-mono text-[11px] font-bold text-amber-500">
                +{hub.detourCount} rotas absorvidas
              </span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Pares de Capitais com Maior Acréscimo de Desvio -->
      {#if $resilienceResults.detourSpikePairs.length > 0}
        <div>
          <h3 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 font-mono">
            Piores Desvios Forçados entre Capitais
          </h3>
          <div class="space-y-1.5">
            {#each $resilienceResults.detourSpikePairs.slice(0, 5) as pair}
              <div class="p-2 rounded-lg bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-mono">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-bold text-gray-900 dark:text-white">
                    {pair.orig_city} ➔ {pair.dest_city}
                  </span>
                  <span class="text-red-500 font-bold">
                    +{pair.increase_km} km (+{pair.increase_pct}%)
                  </span>
                </div>
                <div class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                  Novo trajeto: {pair.new_path.join(' ➔ ')}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Rodapé com Limpeza -->
  <div class="p-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card flex justify-between items-center text-xs">
    <button
      type="button"
      onclick={clearSimulation}
      class="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-dark-surface hover:bg-gray-300 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 font-medium transition-colors"
    >
      Restaurar Operação Normal
    </button>
    <span class="text-[11px] text-gray-400 font-mono">
      Análise estática client-side
    </span>
  </div>
</aside>
