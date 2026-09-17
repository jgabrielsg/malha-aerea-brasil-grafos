<script>
  import { onMount, onDestroy } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import FlightMap from '$lib/components/FlightMap.svelte';
  import TimelineController from '$lib/components/TimelineController.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import AirportPanel from '$lib/components/AirportPanel.svelte';
  import GapInspector from '$lib/components/GapInspector.svelte';
  import ResiliencePanel from '$lib/components/ResiliencePanel.svelte';
  import StoryMode from '$lib/components/StoryMode.svelte';
  import FilterToolbar from '$lib/components/FilterToolbar.svelte';
  import RoutePlanner from '$lib/components/RoutePlanner.svelte';
  import TopRoutesDrawer from '$lib/components/TopRoutesDrawer.svelte';
  import CameraHUD from '$lib/components/CameraHUD.svelte';
  import KeyboardShortcutsModal from '$lib/components/KeyboardShortcutsModal.svelte';
  import ExportModal from '$lib/components/ExportModal.svelte';
  import { isLoading, loadError } from '$lib/stores/dataStore.js';
  import { 
    selectedAirport, 
    selectedYear,
    minFlightThresholdIndex,
    onlyDomestic,
    selectedDistanceBracket,
    metricMode,
    isResilienceMode, 
    isStoryMode, 
    isRoutePlannerOpen,
    isPlaying,
    is3DMode,
    isKeyboardHelpOpen,
    isExportModalOpen,
    shareToastMessage,
    cameraTarget,
    closeAllDrawers,
    openExclusiveDrawer
  } from '$lib/stores/flightState.js';
  import { initUrlSync, syncStateToUrl } from '$lib/analytics/urlSync.js';
  import Icon from '$lib/icons/Icon.svelte';

  let isGapInspectorOpen = $state(false);

  function handleKeyDown(event) {
    // Ignora atalhos quando o usuário estiver digitando em campos de texto
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
      return;
    }

    const key = event.key;

    if (key === ' ') {
      event.preventDefault();
      isPlaying.update(p => !p);
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      selectedYear.update(y => Math.max(2000, y - 1));
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      selectedYear.update(y => Math.min(2026, y + 1));
    } else if (key === 'p' || key === 'P') {
      event.preventDefault();
      if ($isRoutePlannerOpen) {
        closeAllDrawers();
      } else {
        openExclusiveDrawer('routePlanner');
      }
    } else if (key === 'f' || key === 'F') {
      event.preventDefault();
      if ($isResilienceMode) {
        closeAllDrawers();
      } else {
        openExclusiveDrawer('resilience');
      }
    } else if (key === 'h' || key === 'H') {
      event.preventDefault();
      if ($isStoryMode) {
        closeAllDrawers();
      } else {
        openExclusiveDrawer('story');
      }
    } else if (key === 'g' || key === 'G') {
      event.preventDefault();
      isGapInspectorOpen = !isGapInspectorOpen;
    } else if (key === 'r' || key === 'R') {
      event.preventDefault();
      cameraTarget.set([-52.0, -14.5, 4.2, $is3DMode ? 32 : 0, 0]);
    } else if (key === 't' || key === 'T') {
      event.preventDefault();
      is3DMode.update(current => {
        const next = !current;
        if (typeof window !== 'undefined' && window.__geoflight_map_instance) {
          window.__geoflight_map_instance.easeTo({
            pitch: next ? 45 : 0,
            bearing: next ? 16 : 0,
            duration: 1000
          });
        } else {
          cameraTarget.set([-52.0, -14.5, 4.2, next ? 45 : 0, next ? 16 : 0]);
        }
        return next;
      });
    } else if (key === 'Escape') {
      closeAllDrawers();
      isGapInspectorOpen = false;
      isKeyboardHelpOpen.set(false);
      isExportModalOpen.set(false);
    } else if (key === '?') {
      event.preventDefault();
      isKeyboardHelpOpen.update(h => !h);
    }
  }

  onMount(() => {
    initUrlSync();
    window.addEventListener('keydown', handleKeyDown);
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', handleKeyDown);
    }
  });

  // Reage a alterações de filtros e atualiza a URLSearchParams via Svelte 5 $effect
  $effect(() => {
    // Registra dependências reativas nas stores
    const _y = $selectedYear;
    const _f = $minFlightThresholdIndex;
    const _d = $onlyDomestic;
    const _dist = $selectedDistanceBracket;
    const _m = $metricMode;
    const _a = $selectedAirport;
    const _p = $isRoutePlannerOpen;
    const _r = $isResilienceMode;

    if (_y !== undefined) {
      syncStateToUrl();
    }
  });
</script>

<div class="flex flex-col h-full w-full overflow-hidden select-none">
  <!-- Cabeçalho Institucional Gov.br -->
  <Header />

  <!-- Área Principal da Aplicação com Mapa e Painéis Flutuantes -->
  <main class="relative flex-1 w-full h-full overflow-hidden flex">
    <!-- Visualizador Central de Mapa (MapLibre + Deck.gl) -->
    <div class="relative flex-1 h-full w-full">
      <FlightMap />

      <!-- Loading Overlay -->
      {#if $isLoading}
        <div class="absolute inset-0 bg-dark-bg/90 backdrop-blur-sm flex flex-col items-center justify-center z-50 transition-opacity">
          <div class="relative flex items-center justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-gov-blue/20 dark:bg-dark-accent/20 radar-glow flex items-center justify-center">
              <Icon name="plane" class="w-8 h-8 text-gov-blue dark:text-dark-accent -rotate-45 animate-pulse" />
            </div>
          </div>
          <h2 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name="loader2" class="w-4 h-4 animate-spin text-gov-blue dark:text-dark-accent" />
            <span>Carregando Séries Históricas e Grafos (ANAC)...</span>
          </h2>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">
            Indexando 1.166 aeroportos e 26 anos de rotas
          </p>
        </div>
      {/if}

      <!-- Error Banner -->
      {#if $loadError}
        <div class="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2.5 rounded-xl shadow-xl z-50 flex items-center gap-2 text-xs">
          <Icon name="alertCircle" class="w-4 h-4 flex-shrink-0" />
          <span>{$loadError}</span>
        </div>
      {/if}

      <!-- Painel Flutuante Superior: Linha do Tempo e Busca (ocultos no Modo História para dar foco total à narrativa) -->
      {#if !$isStoryMode}
        <div class="absolute top-4 left-4 right-4 sm:right-auto sm:w-[325px] z-30 flex flex-col gap-2 pointer-events-none">
          <!-- Campo de Busca -->
          <div class="pointer-events-auto">
            <SearchBox />
          </div>

          <!-- Controlador Temporal (Timeline) -->
          <div class="pointer-events-auto">
            <TimelineController />
          </div>

          <!-- Filtros de Frequência, Escopo e Distância -->
          <div class="pointer-events-auto">
            <FilterToolbar />
          </div>
        </div>
      {/if}

      <!-- Doca Inferior Esquerda: Desertos de Rota & Top 10 Rotas (Flutuante discreto) -->
      {#if !$isStoryMode && !$isResilienceMode}
        <div class="absolute bottom-4 left-4 z-30 pointer-events-auto flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <GapInspector bind:isOpen={isGapInspectorOpen} />
          <TopRoutesDrawer />
        </div>
      {/if}

      <!-- Controles de Câmera HUD (Reset Brasil, 2D/3D, Snapshot, Tela Cheia, Atalhos) -->
      {#if !$isStoryMode}
        <CameraHUD />
      {/if}

      <!-- Modal de Narrativa Histórica Guiada (Story Mode) -->
      {#if $isStoryMode}
        <StoryMode />
      {/if}
    </div>

    <!-- Painel Lateral: Planejador de Rotas / Simulação de Resiliência / Detalhes do Aeroporto -->
    {#if $isRoutePlannerOpen}
      <RoutePlanner />
    {:else if $isResilienceMode}
      <ResiliencePanel />
    {:else if $selectedAirport}
      <!-- Painel Lateral Retrátil de Detalhes do Aeroporto (Ego-Graph) -->
      <AirportPanel />
    {/if}
  </main>

  <!-- Rodapé Institucional -->
  <Footer />

  <!-- Modais Globais SOTA -->
  <KeyboardShortcutsModal />
  <ExportModal />

  <!-- Toast Notification de Feedback (ex.: Link Copiado) -->
  {#if $shareToastMessage}
    <div class="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gray-900/95 text-white dark:bg-dark-surface/95 dark:text-dark-accent border border-gov-blue/50 dark:border-dark-accent/50 shadow-2xl flex items-center gap-2.5 text-xs font-mono animate-slideUp">
      <Icon name="check" class="w-4 h-4 text-emerald-400 flex-shrink-0" />
      <span>{$shareToastMessage}</span>
    </div>
  {/if}
</div>

<style>
  @keyframes slideUp {
    from { opacity: 0; transform: translate(-50%, 12px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }
  .animate-slideUp {
    animation: slideUp 0.2s ease-out forwards;
  }
</style>

