<script>
  import { 
    theme, 
    metricMode, 
    selectedAirport, 
    selectedGap,
    isResilienceMode,
    isStoryMode,
    currentStoryIndex,
    enableFlowAnimation,
    STORY_CHAPTERS,
    cameraTarget,
    selectedYear,
    simulatedClosedAirport,
    isRoutePlannerOpen,
    activePlannedRoute,
    isExportModalOpen,
    closeAllDrawers,
    openExclusiveDrawer
  } from '$lib/stores/flightState.js';
  import { currentYearStats, isLoading } from '$lib/stores/dataStore.js';
  import { copyShareUrl } from '$lib/analytics/urlSync.js';
  import Icon from '$lib/icons/Icon.svelte';

  function toggleTheme() {
    theme.update(t => {
      const next = t === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        try {
          localStorage.setItem('geoflight_theme', next);
        } catch (e) {}
      }
      return next;
    });
  }

  function toggleStoryMode() {
    isStoryMode.update(active => {
      const next = !active;
      if (next) {
        openExclusiveDrawer('story');
        currentStoryIndex.set(0);
        const firstChapter = STORY_CHAPTERS[0];
        selectedYear.set(firstChapter.year);
        const [lon, lat, zoom] = firstChapter.camera;
        cameraTarget.set([lon, lat, zoom, 42, -12]);
      } else {
        closeAllDrawers();
      }
      return next;
    });
  }

  function toggleResilienceMode() {
    isResilienceMode.update(active => {
      const next = !active;
      if (next) {
        openExclusiveDrawer('resilience');
      } else {
        closeAllDrawers();
      }
      return next;
    });
  }

  function toggleRoutePlanner() {
    isRoutePlannerOpen.update(active => {
      const next = !active;
      if (next) {
        openExclusiveDrawer('routePlanner');
      } else {
        closeAllDrawers();
      }
      return next;
    });
  }

  function toggleFlowAnimation() {
    enableFlowAnimation.update(a => !a);
  }

  function resetSelection() {
    closeAllDrawers();
    cameraTarget.set([-52.0, -14.5, 4.2, 32, 0]);
  }
</script>

<header class="bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-b border-gray-200 dark:border-dark-border z-30 flex-shrink-0 transition-colors">
  <!-- Barra de Topo Verde/Amarelo Estilo Gov.br -->
  <div class="h-1 bg-gradient-to-r from-gov-green via-yellow-400 to-gov-blue"></div>

  <div class="w-full px-3 sm:px-4 h-11 sm:h-12 flex items-center justify-between gap-2 min-w-0">
    <!-- Identificação do Projeto -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <div class="w-7 h-7 rounded-lg bg-gov-blue dark:bg-dark-accent/20 border border-gov-blue/30 dark:border-dark-accent/40 flex items-center justify-center text-white dark:text-dark-accent shadow-sm flex-shrink-0">
        <Icon name="plane" class="w-3.5 h-3.5 -rotate-45" />
      </div>
      <div class="flex items-center gap-1.5">
        <h1 class="text-sm sm:text-base font-bold tracking-tight text-gray-900 dark:text-white flex items-center">
          GeoFlight<span class="text-gov-blue dark:text-dark-accent font-extrabold">-BR</span>
        </h1>
        <span class="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent font-semibold border border-gov-blue/20 dark:border-dark-accent/30">
          ANAC
        </span>
      </div>
    </div>

    <!-- Modos Analíticos Avançados (Planejador / História / Resiliência) -->
    <div class="flex items-center gap-1 flex-shrink-0">
      <!-- Botão Planejador de Rotas Multi-Escala -->
      <button
        type="button"
        onclick={toggleRoutePlanner}
        class="flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded-lg border transition-all whitespace-nowrap {$isRoutePlannerOpen ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-md ring-1 ring-gov-blue/30 dark:ring-dark-accent/30' : 'bg-gray-100 dark:bg-dark-card hover:bg-gov-blue/10 dark:hover:bg-dark-accent/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border'}"
        title="Planejador de Itinerários e Rotas Multi-Escala (Algoritmo Yen SOTA)"
      >
        <Icon name="route" class="w-3.5 h-3.5 {$isRoutePlannerOpen ? 'text-white dark:text-dark-bg' : 'text-gov-blue dark:text-dark-accent'}" />
        <span class="hidden sm:inline">Planejar</span>
      </button>

      <!-- Botão Modo História -->
      <button
        type="button"
        onclick={toggleStoryMode}
        class="flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded-lg border transition-all whitespace-nowrap {$isStoryMode ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-md' : 'bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border'}"
        title="Navegação Guiada pelos Marcos Históricos da Aviação"
      >
        <Icon name="bookOpen" class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">História</span>
      </button>

      <!-- Botão Simulação de Resiliência -->
      <button
        type="button"
        onclick={toggleResilienceMode}
        class="flex items-center gap-1 px-2 py-1 text-xs font-mono font-medium rounded-lg border transition-all whitespace-nowrap {$isResilienceMode ? 'bg-red-500 text-white font-bold border-red-600 shadow-md animate-pulse' : 'bg-gray-100 dark:bg-dark-card hover:bg-red-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border'}"
        title="Simular Falhas e Interdição de Aeroportos Críticos"
      >
        <Icon name="shieldAlert" class="w-3.5 h-3.5 {$isResilienceMode ? 'text-white' : 'text-red-500'}" />
        <span class="hidden sm:inline">Falhas</span>
      </button>
    </div>

    <!-- Controles de Métrica, Ações e Tema -->
    <div class="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
      <!-- Seletor de Métrica dos Nós -->
      <div class="hidden md:flex items-center rounded-lg bg-gray-100 dark:bg-dark-card p-0.5 border border-gray-200 dark:border-dark-border text-[11px] font-mono">
        <button
          type="button"
          class="px-2 py-0.5 rounded-md font-medium transition-all {$metricMode === 'flights' ? 'bg-white dark:bg-gov-blue text-gov-blue dark:text-white shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => metricMode.set('flights')}
          title="Tamanho dos nós proporcional ao volume de voos"
        >
          Voos
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded-md font-medium transition-all {$metricMode === 'betweenness' ? 'bg-white dark:bg-gov-blue text-gov-blue dark:text-white shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => metricMode.set('betweenness')}
          title="Centralidade de Intermediação (Hubs Estratégicos)"
        >
          Hubs
        </button>
        <button
          type="button"
          class="px-2 py-0.5 rounded-md font-medium transition-all {$metricMode === 'degree' ? 'bg-white dark:bg-gov-blue text-gov-blue dark:text-white shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => metricMode.set('degree')}
          title="Quantidade de cidades conectadas diretamente (Grau)"
        >
          Grau
        </button>
      </div>

      <!-- Botão de Limpar Seleção / Visão Global -->
      {#if $selectedAirport || $selectedGap || $simulatedClosedAirport || $isResilienceMode || $isStoryMode || $isRoutePlannerOpen}
        <button
          type="button"
          onclick={resetSelection}
          class="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all whitespace-nowrap shadow-sm"
          title="Limpar foco e restaurar visão panorâmica da malha"
        >
          <Icon name="rotateCcw" class="w-3.5 h-3.5" />
          <span class="hidden lg:inline">Global</span>
        </button>
      {/if}

      <!-- Botão Compartilhar Link (Permalink) -->
      <button
        type="button"
        onclick={copyShareUrl}
        class="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-card hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border transition-colors shadow-sm flex items-center gap-1"
        title="Copiar link permanente desta visualização com os filtros atuais"
      >
        <Icon name="copy" class="w-3.5 h-3.5 text-gov-blue dark:text-dark-accent" />
        <span class="hidden 2xl:inline text-xs font-mono">Compartilhar</span>
      </button>

      <!-- Botão Exportar (PNG / CSV) -->
      <button
        type="button"
        onclick={() => isExportModalOpen.set(true)}
        class="p-1.5 rounded-lg bg-gray-100 dark:bg-dark-card hover:bg-emerald-500/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-dark-border transition-colors shadow-sm flex items-center gap-1"
        title="Exportar Captura do Mapa (PNG) ou Planilha de Dados (CSV)"
      >
        <Icon name="download" class="w-3.5 h-3.5 text-emerald-500" />
        <span class="hidden 2xl:inline text-xs font-mono">Exportar</span>
      </button>

      <!-- Link Fonte de Dados ANAC (Desktop/Tablet) -->
      <a
        href="https://www.gov.br/anac/pt-br/assuntos/dados-e-estatisticas/historico-de-voos"
        target="_blank"
        rel="noopener noreferrer"
        class="hidden sm:flex p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        title="Fonte de Dados: Microdados ANAC (VRA)"
      >
        <Icon name="externalLink" class="w-3.5 h-3.5" />
      </a>

      <!-- Alternador de Tema -->
      <button
        type="button"
        onclick={toggleTheme}
        class="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        title={$theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Dark Mode'}
      >
        {#if $theme === 'dark'}
          <Icon name="sun" class="w-3.5 h-3.5 text-amber-400" />
        {:else}
          <Icon name="moon" class="w-3.5 h-3.5 text-gov-blue" />
        {/if}
      </button>
    </div>
  </div>
</header>
