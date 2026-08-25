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
    simulatedClosedAirport 
  } from '$lib/stores/flightState.js';
  import { currentYearStats, isLoading } from '$lib/stores/dataStore.js';
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
        localStorage.setItem('geoflight_theme', next);
      }
      return next;
    });
  }

  function toggleStoryMode() {
    isStoryMode.update(active => {
      const next = !active;
      if (next) {
        isResilienceMode.set(false);
        selectedAirport.set(null);
        selectedGap.set(null);
        currentStoryIndex.set(0);
        const chapter = STORY_CHAPTERS[0];
        selectedYear.set(chapter.year);
        const [lon, lat, zoom] = chapter.camera;
        cameraTarget.set([lon, lat, zoom, 40, -10]);
      }
      return next;
    });
  }

  function toggleResilienceMode() {
    isResilienceMode.update(active => {
      const next = !active;
      if (next) {
        isStoryMode.set(false);
        selectedAirport.set(null);
        selectedGap.set(null);
      } else {
        simulatedClosedAirport.set(null);
      }
      return next;
    });
  }

  function toggleFlowAnimation() {
    enableFlowAnimation.update(a => !a);
  }

  function resetSelection() {
    selectedAirport.set(null);
    selectedGap.set(null);
    simulatedClosedAirport.set(null);
    isResilienceMode.set(false);
    isStoryMode.set(false);
    cameraTarget.set([-52.0, -14.5, 4.2, 32, 0]);
  }
</script>

<header class="bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-b border-gray-200 dark:border-dark-border z-30 flex-shrink-0 transition-colors">
  <!-- Barra de Topo Verde/Amarelo Estilo Gov.br -->
  <div class="h-1 bg-gradient-to-r from-gov-green via-yellow-400 to-gov-blue"></div>

  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-3">
    <!-- Identificação do Projeto -->
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 rounded-lg bg-gov-blue dark:bg-dark-accent/20 border border-gov-blue/30 dark:border-dark-accent/40 flex items-center justify-center text-white dark:text-dark-accent shadow-sm">
        <Icon name="plane" class="w-5 h-5 -rotate-45" />
      </div>
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-1.5">
            GeoFlight<span class="text-gov-blue dark:text-dark-accent font-extrabold">-BR</span>
          </h1>
          <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent font-semibold border border-gov-blue/20 dark:border-dark-accent/30">
            ANAC/VRA
          </span>
        </div>
        <p class="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          Painel de Análise Topológica da Malha Aérea Brasileira (2000–2026)
        </p>
      </div>
    </div>

    <!-- Modos Analíticos Avançados (História / Resiliência / Fluxo) -->
    <div class="flex items-center gap-1.5">
      <!-- Botão Modo História -->
      <button
        type="button"
        onclick={toggleStoryMode}
        class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all {$isStoryMode ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-md' : 'bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border'}"
        title="Ativar Navegação Guiada pelos Marcos Históricos da Aviação"
      >
        <Icon name="bookOpen" class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">História</span>
      </button>

      <!-- Botão Simulação de Resiliência -->
      <button
        type="button"
        onclick={toggleResilienceMode}
        class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all {$isResilienceMode ? 'bg-red-500 text-white font-bold border-red-600 shadow-md animate-pulse' : 'bg-gray-100 dark:bg-dark-card hover:bg-red-500/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-border'}"
        title="Simular Falhas e Interdição de Aeroportos Críticos (What-If)"
      >
        <Icon name="shieldAlert" class="w-3.5 h-3.5 {$isResilienceMode ? 'text-white' : 'text-red-500'}" />
        <span class="hidden sm:inline">Simular Falha</span>
      </button>
    </div>

    <!-- Estatísticas Rápidas do Ano Atual -->
    {#if !$isLoading && !$isResilienceMode && !$isStoryMode}
      <div class="hidden xl:flex items-center gap-4 text-xs font-mono py-1 px-3 rounded-lg bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300">
        <div class="flex items-center gap-1.5" title="Aeroportos ativos com voos no ano">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-bold text-gray-900 dark:text-white">{$currentYearStats.activeAirports}</span> aeroportos
        </div>
        <span class="text-gray-300 dark:text-gray-600">|</span>
        <div class="flex items-center gap-1.5" title="Rotas únicas ativas">
          <Icon name="share2" class="w-3.5 h-3.5 text-gov-blue dark:text-dark-accent" />
          <span class="font-bold text-gray-900 dark:text-white">{$currentYearStats.activeRoutes.toLocaleString('pt-BR')}</span> rotas
        </div>
        <span class="text-gray-300 dark:text-gray-600">|</span>
        <div class="flex items-center gap-1.5" title="Decolagens anuais realizadas">
          <Icon name="activity" class="w-3.5 h-3.5 text-amber-500" />
          <span class="font-bold text-gray-900 dark:text-white">{$currentYearStats.totalFlights.toLocaleString('pt-BR')}</span> voos
        </div>
      </div>
    {/if}

    <!-- Controles de Métrica, Reset e Tema -->
    <div class="flex items-center gap-2">
      <!-- Seletor de Métrica dos Nós -->
      <div class="hidden lg:flex items-center rounded-lg bg-gray-100 dark:bg-dark-card p-0.5 border border-gray-200 dark:border-dark-border text-xs">
        <button
          type="button"
          class="px-2 py-1 rounded-md font-medium transition-all {$metricMode === 'flights' ? 'bg-white dark:bg-gov-blue text-gov-blue dark:text-white shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => metricMode.set('flights')}
          title="Tamanho dos nós proporcional ao volume de voos"
        >
          Voos
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded-md font-medium transition-all {$metricMode === 'betweenness' ? 'bg-white dark:bg-gov-blue text-gov-blue dark:text-white shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => metricMode.set('betweenness')}
          title="Tamanho e cor proporcionais à centralidade de intermediação (Hubs)"
        >
          Betweenness
        </button>
        <button
          type="button"
          class="px-2 py-1 rounded-md font-medium transition-all {$metricMode === 'degree' ? 'bg-white dark:bg-gov-blue text-gov-blue dark:text-white shadow-sm font-semibold' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}"
          onclick={() => metricMode.set('degree')}
          title="Tamanho proporcional à quantidade de cidades conectadas (Grau)"
        >
          Grau
        </button>
      </div>

      <!-- Botão de Limpar Seleção -->
      {#if $selectedAirport || $selectedGap || $simulatedClosedAirport || $isResilienceMode || $isStoryMode}
        <button
          type="button"
          onclick={resetSelection}
          class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
          title="Limpar foco e restaurar visão global da malha"
        >
          <Icon name="rotateCcw" class="w-3.5 h-3.5" />
          <span class="hidden sm:inline">Visão Global</span>
        </button>
      {/if}

      <!-- Links Externos -->
      <a
        href="https://www.gov.br/anac/pt-br/assuntos/dados-e-estatisticas/historico-de-voos"
        target="_blank"
        rel="noopener noreferrer"
        class="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        title="Fonte de Dados: Microdados ANAC (VRA)"
      >
        <Icon name="externalLink" class="w-4 h-4" />
      </a>

      <!-- Alternador de Tema -->
      <button
        type="button"
        onclick={toggleTheme}
        class="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        title={$theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Dark Mode'}
      >
        {#if $theme === 'dark'}
          <Icon name="sun" class="w-4 h-4 text-amber-400" />
        {:else}
          <Icon name="moon" class="w-4 h-4 text-gov-blue" />
        {/if}
      </button>
    </div>
  </div>
</header>
