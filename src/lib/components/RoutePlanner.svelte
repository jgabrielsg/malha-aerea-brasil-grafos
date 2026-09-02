<script>
  import { 
    selectedYear,
    minFlightThresholdIndex,
    onlyDomestic,
    FREQUENCY_LEVELS,
    isRoutePlannerOpen,
    plannedRouteOrigin,
    plannedRouteDest,
    activePlannedRoute,
    cameraBounds
  } from '$lib/stores/flightState.js';
  import { 
    airportsList, 
    currentRoutes, 
    rawYearRoutes, 
    rawAirports 
  } from '$lib/stores/dataStore.js';
  import { 
    findKShortestPaths, 
    checkRouteFeasibilitySuggestion,
    calculateHaversineKm
  } from '$lib/analytics/routeRouter.js';
  import Icon from '$lib/icons/Icon.svelte';

  // Estados dos inputs de autocomplete
  let originQuery = $state('');
  let destQuery = $state('');
  let isOriginDropdownOpen = $state(false);
  let isDestDropdownOpen = $state(false);
  let originInputEl;
  let destInputEl;

  // Opção expandida na lista de alternativas (índices 1 a 4)
  let expandedOptionIndex = $state(null);

  // Inicializa textos de busca com os nós padrão se existirem
  $effect(() => {
    if ($plannedRouteOrigin && $rawAirports[$plannedRouteOrigin] && !originQuery) {
      const a = $rawAirports[$plannedRouteOrigin];
      originQuery = `${a.icao} - ${a.city || a.name}`;
    }
    if ($plannedRouteDest && $rawAirports[$plannedRouteDest] && !destQuery) {
      const a = $rawAirports[$plannedRouteDest];
      destQuery = `${a.icao} - ${a.city || a.name}`;
    }
  });

  // Filtros de autocomplete para Origem e Destino
  let originSuggestions = $derived(
    originQuery.trim().length >= 2
      ? $airportsList.filter(a => {
          const q = originQuery.trim().toLowerCase();
          return (
            a.icao.toLowerCase().includes(q) ||
            (a.iata && a.iata.toLowerCase().includes(q)) ||
            (a.city && a.city.toLowerCase().includes(q)) ||
            (a.state && a.state.toLowerCase().includes(q)) ||
            (a.name && a.name.toLowerCase().includes(q))
          );
        }).slice(0, 7)
      : []
  );

  let destSuggestions = $derived(
    destQuery.trim().length >= 2
      ? $airportsList.filter(a => {
          const q = destQuery.trim().toLowerCase();
          return (
            a.icao.toLowerCase().includes(q) ||
            (a.iata && a.iata.toLowerCase().includes(q)) ||
            (a.city && a.city.toLowerCase().includes(q)) ||
            (a.state && a.state.toLowerCase().includes(q)) ||
            (a.name && a.name.toLowerCase().includes(q))
          );
        }).slice(0, 7)
      : []
  );

  // Cálculo reativo das k melhores rotas (Yen k-Shortest Paths)
  let routeResults = $derived.by(() => {
    const orig = $plannedRouteOrigin;
    const dest = $plannedRouteDest;

    if (!orig || !dest || orig === dest) return [];
    if (!$currentRoutes || $currentRoutes.length === 0) return [];

    return findKShortestPaths(orig, dest, $currentRoutes, $rawAirports, 5);
  });

  // Sugestão de viabilidade caso não haja rotas com o filtro ativo
  let feasibilitySuggestion = $derived.by(() => {
    const orig = $plannedRouteOrigin;
    const dest = $plannedRouteDest;

    if (!orig || !dest || orig === dest) return null;
    if (routeResults.length > 0) return null;

    return checkRouteFeasibilitySuggestion(
      orig,
      dest,
      $rawYearRoutes,
      $rawAirports,
      FREQUENCY_LEVELS,
      $minFlightThresholdIndex
    );
  });

  // Sincroniza a rota ótima com a store ativa e ajusta a câmera do mapa
  $effect(() => {
    if (routeResults.length > 0) {
      // Se não há rota ativa ou a rota ativa não pertence a este conjunto de resultados, seleciona a primeira (ótima)
      const currentActive = $activePlannedRoute;
      const isCurrentInResults = currentActive && routeResults.some(r => r.id === currentActive.id);

      if (!isCurrentInResults) {
        selectRoute(routeResults[0]);
      }
    } else {
      activePlannedRoute.set(null);
    }
  });

  function selectRoute(routeOption) {
    activePlannedRoute.set(routeOption);

    // Calcula bounds geográficos de todos os nós para enquadramento perfeito no mapa
    if (routeOption?.path && routeOption.path.length > 0) {
      let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
      let validCoords = 0;

      for (const icao of routeOption.path) {
        const air = $rawAirports[icao];
        if (air && air.lon !== undefined && air.lat !== undefined) {
          minLon = Math.min(minLon, air.lon);
          maxLon = Math.max(maxLon, air.lon);
          minLat = Math.min(minLat, air.lat);
          maxLat = Math.max(maxLat, air.lat);
          validCoords++;
        }
      }

      if (validCoords > 0) {
        // Margem de respiro mínima se os pontos forem muito próximos
        const dLon = Math.max(1.5, (maxLon - minLon) * 0.15);
        const dLat = Math.max(1.5, (maxLat - minLat) * 0.15);
        cameraBounds.set([
          [minLon - dLon, minLat - dLat],
          [maxLon + dLon, maxLat + dLat]
        ]);
      }
    }
  }

  function swapOriginDest() {
    const orig = $plannedRouteOrigin;
    const dest = $plannedRouteDest;
    const origQ = originQuery;
    const destQ = destQuery;

    plannedRouteOrigin.set(dest);
    plannedRouteDest.set(orig);
    originQuery = destQ;
    destQuery = origQ;
  }

  function handleSelectOrigin(airport) {
    plannedRouteOrigin.set(airport.icao);
    originQuery = `${airport.icao} - ${airport.city || airport.name}`;
    isOriginDropdownOpen = false;
  }

  function handleSelectDest(airport) {
    plannedRouteDest.set(airport.icao);
    destQuery = `${airport.icao} - ${airport.city || airport.name}`;
    isDestDropdownOpen = false;
  }

  function applySuggestedThreshold() {
    if (feasibilitySuggestion) {
      minFlightThresholdIndex.set(feasibilitySuggestion.viableIndex);
    }
  }

  function closePlanner() {
    isRoutePlannerOpen.set(false);
    activePlannedRoute.set(null);
  }

  function toggleExpandOption(idx) {
    expandedOptionIndex = expandedOptionIndex === idx ? null : idx;
  }

  function getHubsSummary(route) {
    if (route.hops === 0) return 'Voo direto (sem escalas)';
    const hubs = route.path.slice(1, -1).map(icao => $rawAirports[icao]?.city || icao);
    return `via ${hubs.join(' e ')}`;
  }
</script>

<aside class="fixed inset-y-0 right-0 w-full sm:w-[460px] bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border-l border-gray-200 dark:border-dark-border shadow-2xl z-40 flex flex-col transition-all overflow-hidden">
  <!-- Cabeçalho do Planejador -->
  <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-start justify-between gap-3 bg-gradient-to-r from-gov-blue/10 dark:from-dark-accent/10 via-transparent to-transparent">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 rounded-xl bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg flex items-center justify-center shadow-md flex-shrink-0">
        <Icon name="route" class="w-5 h-5" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h2 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
            Planejador de Itinerários
          </h2>
          <span class="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-gov-blue/15 text-gov-blue dark:text-dark-accent font-bold">
            Yen SOTA
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Otimização multi-escala ponderada ({$selectedYear})
        </p>
      </div>
    </div>

    <button
      type="button"
      onclick={closePlanner}
      class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors flex-shrink-0"
      title="Fechar Planejador de Rotas"
    >
      <Icon name="x" class="w-5 h-5" />
    </button>
  </div>

  <!-- Entradas de Busca (Origem, Destino e Inversão) -->
  <div class="p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-card/30 flex flex-col gap-2.5">
    <div class="relative flex flex-col sm:flex-row items-center gap-2">
      <!-- Campo Origem -->
      <div class="relative flex-1 w-full">
        <div class="relative flex items-center">
          <span class="absolute left-2.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
          <input
            bind:this={originInputEl}
            type="text"
            bind:value={originQuery}
            onfocus={() => isOriginDropdownOpen = true}
            oninput={() => isOriginDropdownOpen = true}
            placeholder="Aeroporto de Origem..."
            class="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gov-blue dark:focus:ring-dark-accent"
          />
          {#if originQuery}
            <button
              type="button"
              onclick={() => { originQuery = ''; plannedRouteOrigin.set(null); if (originInputEl) originInputEl.focus(); }}
              class="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <Icon name="x" class="w-3 h-3" />
            </button>
          {/if}
        </div>

        <!-- Dropdown de Autocomplete: Origem -->
        {#if isOriginDropdownOpen && originSuggestions.length > 0}
          <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
            {#each originSuggestions as airport}
              <button
                type="button"
                onclick={() => handleSelectOrigin(airport)}
                class="w-full text-left px-3 py-2 text-xs hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 border-b border-gray-100 dark:border-dark-border/40 last:border-0 flex items-center justify-between"
              >
                <div class="truncate">
                  <span class="font-mono font-bold text-gray-900 dark:text-white mr-1.5">{airport.icao}</span>
                  {#if airport.iata}<span class="text-[10px] text-gray-500 mr-1.5 font-mono">({airport.iata})</span>{/if}
                  <span class="text-gray-600 dark:text-gray-300">{airport.city || airport.name}</span>
                </div>
                {#if airport.is_capital}
                  <span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold ml-1">CAPITAL</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Botão de Inversão de Sentido -->
      <button
        type="button"
        onclick={swapOriginDest}
        class="p-2 rounded-lg bg-gray-200 dark:bg-dark-card hover:bg-gov-blue hover:text-white dark:hover:bg-dark-accent dark:hover:text-dark-bg text-gray-600 dark:text-gray-300 transition-all shadow-sm flex-shrink-0"
        title="Inverter Origem e Destino"
      >
        <Icon name="arrowLeftRight" class="w-4 h-4" />
      </button>

      <!-- Campo Destino -->
      <div class="relative flex-1 w-full">
        <div class="relative flex items-center">
          <span class="absolute left-2.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/20"></span>
          <input
            bind:this={destInputEl}
            type="text"
            bind:value={destQuery}
            onfocus={() => isDestDropdownOpen = true}
            oninput={() => isDestDropdownOpen = true}
            placeholder="Aeroporto de Destino..."
            class="w-full pl-8 pr-7 py-2 text-xs bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gov-blue dark:focus:ring-dark-accent"
          />
          {#if destQuery}
            <button
              type="button"
              onclick={() => { destQuery = ''; plannedRouteDest.set(null); if (destInputEl) destInputEl.focus(); }}
              class="absolute right-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <Icon name="x" class="w-3 h-3" />
            </button>
          {/if}
        </div>

        <!-- Dropdown de Autocomplete: Destino -->
        {#if isDestDropdownOpen && destSuggestions.length > 0}
          <div class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
            {#each destSuggestions as airport}
              <button
                type="button"
                onclick={() => handleSelectDest(airport)}
                class="w-full text-left px-3 py-2 text-xs hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 border-b border-gray-100 dark:border-dark-border/40 last:border-0 flex items-center justify-between"
              >
                <div class="truncate">
                  <span class="font-mono font-bold text-gray-900 dark:text-white mr-1.5">{airport.icao}</span>
                  {#if airport.iata}<span class="text-[10px] text-gray-500 mr-1.5 font-mono">({airport.iata})</span>{/if}
                  <span class="text-gray-600 dark:text-gray-300">{airport.city || airport.name}</span>
                </div>
                {#if airport.is_capital}
                  <span class="text-[9px] px-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold ml-1">CAPITAL</span>
                {/if}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Conteúdo de Resultados ou Alertas -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3.5">
    <!-- Alerta Contextual Reativo: Quando o filtro de frequência inviabiliza as rotas -->
    {#if feasibilitySuggestion}
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex flex-col gap-2 animate-fadeIn">
        <div class="flex items-start gap-2">
          <Icon name="alertTriangle" class="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div class="space-y-1 leading-relaxed">
            <p class="font-bold">Nenhuma rota encontrada com o filtro atual</p>
            <p class="text-[11px] text-amber-700 dark:text-amber-200/90">
              Com o limiar atual de <span class="font-mono font-bold">"{feasibilitySuggestion.currentLevel.label}"</span> ({feasibilitySuggestion.currentLevel.text}), não há conexões viáveis. Reduza o filtro para <span class="font-mono font-bold">"{feasibilitySuggestion.viableLevel.label}"</span> para liberar alternativas operacionais.
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={applySuggestedThreshold}
          class="self-end px-2.5 py-1 rounded-md bg-amber-500 text-white font-medium text-[11px] hover:bg-amber-600 transition-colors shadow-sm"
        >
          Ajustar para {feasibilitySuggestion.viableLevel.label}
        </button>
      </div>
    {:else if routeResults.length === 0 && $plannedRouteOrigin && $plannedRouteDest}
      <div class="p-6 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border text-center text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
        <Icon name="alertCircle" class="w-6 h-6 text-gray-400 mx-auto" />
        <p class="font-medium text-gray-700 dark:text-gray-200">Sem conectividade no ano selecionado</p>
        <p class="text-[11px]">
          Não há registro de operações interligando {$plannedRouteOrigin} e {$plannedRouteDest} em {$selectedYear}.
        </p>
      </div>
    {/if}

    <!-- Lista de Opções Encontradas (1 Principal + 4 Alternativas) -->
    {#if routeResults.length > 0}
      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 font-mono px-1">
        <span>Itinerários Otimizados ({routeResults.length} opções)</span>
        <span class="text-[10px] text-emerald-500 font-semibold">● Penalidade: +350 km/escala</span>
      </div>

      <!-- OPÇÃO 1: RECOMENDADA / ÓTIMA -->
      {@const opt1 = routeResults[0]}
      {@const isOpt1Active = $activePlannedRoute?.id === opt1.id}
      <div 
        role="button"
        tabindex="0"
        onclick={() => selectRoute(opt1)}
        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectRoute(opt1); }}
        class="w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer shadow-md {isOpt1Active ? 'bg-gov-blue/5 dark:bg-dark-accent/10 border-gov-blue dark:border-dark-accent ring-1 ring-gov-blue/30 dark:ring-dark-accent/30' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-gov-blue/40'}"
      >
        <!-- Badge e Resumo da Opção Ótima -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold shadow-sm uppercase tracking-wider">
              Melhor Rota
            </span>
            <span class="text-xs font-bold text-gray-900 dark:text-white">
              {opt1.hops === 0 ? 'Voo Direto' : `${opt1.hops} ${opt1.hops === 1 ? 'Escala' : 'Escalas'}`}
            </span>
          </div>

          <div class="flex items-center gap-2 font-mono text-xs text-gray-600 dark:text-gray-300">
            <span class="font-bold text-gray-900 dark:text-white">{opt1.totalDistanceKm.toLocaleString('pt-BR')} km</span>
            <span class="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 dark:bg-dark-surface text-gray-500" title="Razão de desvio sobre a linha reta">
              {opt1.detourRatio}x desvio
            </span>
          </div>
        </div>

        <!-- Linha do Tempo Visual dos Trechos (Stepper Horizontal) -->
        <div class="my-3 py-2 px-2.5 rounded-lg bg-gray-50 dark:bg-dark-surface/60 border border-gray-100 dark:border-dark-border/60">
          <div class="flex items-center justify-between gap-1 overflow-x-auto py-1">
            {#each opt1.path as icao, idx}
              <div class="flex flex-col items-center min-w-0">
                <span class="font-mono font-extrabold text-xs text-gray-900 dark:text-white px-1.5 py-0.5 rounded {idx === 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : idx === opt1.path.length - 1 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-gray-200 dark:bg-dark-card text-gray-700 dark:text-gray-300'}">
                  {icao}
                </span>
                <span class="text-[9px] text-gray-500 dark:text-gray-400 truncate max-w-[65px] text-center mt-0.5">
                  {$rawAirports[icao]?.city || icao}
                </span>
              </div>

              {#if idx < opt1.segments.length}
                {@const seg = opt1.segments[idx]}
                <div class="flex flex-col items-center flex-1 min-w-[50px] px-1">
                  <span class="text-[9px] font-mono font-semibold text-gov-blue dark:text-dark-accent truncate">
                    {seg.cadenceLabel}
                  </span>
                  <div class="w-full h-0.5 bg-gov-blue/30 dark:bg-dark-accent/30 relative my-0.5">
                    <span class="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-gov-blue dark:border-dark-accent transform rotate-45"></span>
                  </div>
                  <span class="text-[8px] font-mono text-gray-400">
                    {Math.round(seg.dist_km)} km
                  </span>
                </div>
              {/if}
            {/each}
          </div>
        </div>

        <!-- Destaque do Elo Crítico / Gargalo -->
        {#if opt1.bottleneckSegment}
          <div class="flex items-center gap-1.5 text-[11px] p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 mt-2">
            <Icon name="activity" class="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <span class="truncate">
              <b>Elo Crítico:</b> Trecho <b>{opt1.bottleneckSegment.origCity} ➔ {opt1.bottleneckSegment.destCity}</b> com {opt1.bottleneckSegment.cadenceLabel} ({opt1.bottleneckSegment.flights.toLocaleString('pt-BR')} voos/ano)
            </span>
          </div>
        {/if}
      </div>

      <!-- OPÇÕES ALTERNATIVAS (2 a 5) -->
      {#if routeResults.length > 1}
        <div class="space-y-2 mt-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 font-mono">
            Rotas Alternativas ({routeResults.length - 1})
          </h4>

          {#each routeResults.slice(1) as altOpt, altIdx}
            {@const isAltActive = $activePlannedRoute?.id === altOpt.id}
            {@const isExpanded = expandedOptionIndex === altOpt.index}
            {@const extraKm = altOpt.totalDistanceKm - opt1.totalDistanceKm}

            <div class="rounded-xl border transition-all {isAltActive ? 'bg-gov-blue/5 dark:bg-dark-accent/10 border-gov-blue dark:border-dark-accent shadow-sm' : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-gray-700'}">
              <!-- Linha Principal Clicável -->
              <div
                role="button"
                tabindex="0"
                onclick={() => selectRoute(altOpt)}
                onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectRoute(altOpt); }}
                class="w-full text-left p-3 flex items-center justify-between gap-2 cursor-pointer"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-mono font-bold text-xs px-1.5 py-0.2 rounded bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-gray-300">
                      Opção {altOpt.rank}
                    </span>
                    <span class="text-xs font-semibold text-gray-900 dark:text-white truncate">
                      {getHubsSummary(altOpt)}
                    </span>
                  </div>

                  <div class="flex items-center gap-2 font-mono text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    <span>{altOpt.totalDistanceKm.toLocaleString('pt-BR')} km</span>
                    {#if extraKm > 0}
                      <span class="text-amber-500 font-medium">+{extraKm} km</span>
                    {/if}
                    <span>•</span>
                    <span>{altOpt.hops} {altOpt.hops === 1 ? 'escala' : 'escalas'}</span>
                    <span>•</span>
                    <span class="text-gray-400">elo: {altOpt.bottleneckFlights.toLocaleString('pt-BR')} v.</span>
                  </div>
                </div>

                <!-- Botão de Expandir Detalhes do Stepper -->
                <button
                  type="button"
                  onclick={(e) => { e.stopPropagation(); toggleExpandOption(altOpt.index); }}
                  class="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                  title={isExpanded ? 'Recolher detalhes' : 'Ver trechos da rota'}
                >
                  <Icon name={isExpanded ? 'chevronLeft' : 'chevronRight'} class="w-4 h-4 transform {isExpanded ? '-rotate-90' : 'rotate-90'}" />
                </button>
              </div>

              <!-- Stepper Expansível para Rotas Alternativas -->
              {#if isExpanded}
                <div class="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-dark-border/50 animate-fadeIn">
                  <div class="py-2 px-2 rounded-lg bg-gray-50 dark:bg-dark-surface/60 border border-gray-100 dark:border-dark-border/40">
                    <div class="flex items-center justify-between gap-1 overflow-x-auto py-1">
                      {#each altOpt.path as icao, idx}
                        <div class="flex flex-col items-center min-w-0">
                          <span class="font-mono font-bold text-[11px] text-gray-900 dark:text-white px-1.5 py-0.5 rounded {idx === 0 ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : idx === altOpt.path.length - 1 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-gray-200 dark:bg-dark-card text-gray-700 dark:text-gray-300'}">
                            {icao}
                          </span>
                          <span class="text-[8px] text-gray-500 truncate max-w-[60px] text-center mt-0.5">
                            {$rawAirports[icao]?.city || icao}
                          </span>
                        </div>

                        {#if idx < altOpt.segments.length}
                          {@const seg = altOpt.segments[idx]}
                          <div class="flex flex-col items-center flex-1 min-w-[45px] px-0.5">
                            <span class="text-[8px] font-mono font-semibold text-gov-blue dark:text-dark-accent truncate">
                              {seg.cadenceLabel}
                            </span>
                            <div class="w-full h-0.5 bg-gov-blue/30 dark:bg-dark-accent/30 relative my-0.5">
                              <span class="absolute right-0 -top-1 w-1.5 h-1.5 border-t-2 border-r-2 border-gov-blue dark:border-dark-accent transform rotate-45"></span>
                            </div>
                            <span class="text-[8px] font-mono text-gray-400">
                              {Math.round(seg.dist_km)} km
                            </span>
                          </div>
                        {/if}
                      {/each}
                    </div>
                  </div>

                  {#if altOpt.bottleneckSegment}
                    <div class="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                      <Icon name="activity" class="w-3 h-3 flex-shrink-0" />
                      <span class="truncate">Gargalo: {altOpt.bottleneckSegment.origCity} ➔ {altOpt.bottleneckSegment.destCity} ({altOpt.bottleneckSegment.cadenceLabel})</span>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</aside>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-2px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out forwards;
  }
</style>
