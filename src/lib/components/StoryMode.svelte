<script>
  import { 
    isStoryMode, 
    currentStoryIndex, 
    STORY_CHAPTERS, 
    selectedYear, 
    cameraTarget,
    selectedAirport,
    selectedGap,
    simulatedClosedAirport 
  } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  function activateChapter(idx) {
    if (idx < 0 || idx >= STORY_CHAPTERS.length) return;
    
    currentStoryIndex.set(idx);
    const chapter = STORY_CHAPTERS[idx];
    
    // Atualiza ano e move câmera suavemente
    selectedYear.set(chapter.year);
    selectedAirport.set(null);
    selectedGap.set(null);
    simulatedClosedAirport.set(null);

    const [lon, lat, zoom] = chapter.camera;
    cameraTarget.set([lon, lat, zoom, 42, idx % 2 === 0 ? -12 : 12]);
  }

  function nextChapter() {
    if ($currentStoryIndex < STORY_CHAPTERS.length - 1) {
      activateChapter($currentStoryIndex + 1);
    }
  }

  function prevChapter() {
    if ($currentStoryIndex > 0) {
      activateChapter($currentStoryIndex - 1);
    }
  }

  function exitStoryMode() {
    isStoryMode.set(false);
  }

  $: currentChapter = STORY_CHAPTERS[$currentStoryIndex];
</script>

<div class="fixed inset-x-4 bottom-6 sm:left-auto sm:right-6 sm:w-[480px] bg-white/95 dark:bg-dark-surface/95 backdrop-blur-md border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl z-50 p-4 sm:p-5 transition-all animate-slideUp">
  <!-- Barra de Navegação Superior do Capítulo -->
  <div class="flex items-center justify-between gap-3 mb-3 border-b border-gray-100 dark:border-dark-border/60 pb-3">
    <div class="flex items-center gap-2">
      <div class="w-6 h-6 rounded-md bg-gov-blue/15 dark:bg-dark-accent/20 text-gov-blue dark:text-dark-accent flex items-center justify-center">
        <Icon name="bookOpen" class="w-3.5 h-3.5" />
      </div>
      <span class="text-xs font-mono font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Narrativa Histórica • Capítulo {$currentStoryIndex + 1} de {STORY_CHAPTERS.length}
      </span>
    </div>

    <button
      type="button"
      onclick={exitStoryMode}
      class="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
      title="Sair do Modo História"
    >
      <Icon name="x" class="w-4 h-4" />
    </button>
  </div>

  <!-- Conteúdo Principal do Capítulo -->
  <div class="space-y-3">
    <div>
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-gov-blue text-white dark:bg-dark-accent dark:text-dark-bg">
          {currentChapter.year}
        </span>
        <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white tracking-tight">
          {currentChapter.title}
        </h3>
      </div>
      <p class="text-xs font-medium text-gov-blue dark:text-dark-accent mt-0.5">
        {currentChapter.subtitle}
      </p>
    </div>

    <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
      {currentChapter.description}
    </p>

    <!-- Indicadores Contextuais do Capítulo -->
    <div class="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border text-center font-mono text-xs">
      <div>
        <span class="text-[10px] text-gray-400 block">Aeroportos</span>
        <span class="font-bold text-gray-900 dark:text-white">{currentChapter.stats.activeAirports}</span>
      </div>
      <div>
        <span class="text-[10px] text-gray-400 block">Voos Realizados</span>
        <span class="font-bold text-gov-blue dark:text-dark-accent">{(currentChapter.stats.totalFlights / 1000).toFixed(0)}k</span>
      </div>
      <div>
        <span class="text-[10px] text-gray-400 block">Nós em Foco</span>
        <span class="font-bold text-amber-500">{currentChapter.highlightNodes.length}</span>
      </div>
    </div>

    <!-- Nós de Destaque -->
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-[11px] font-mono text-gray-400">Hubs em foco:</span>
      {#each currentChapter.highlightNodes as icao}
        <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent font-bold border border-gov-blue/20 dark:border-dark-accent/30">
          {icao}
        </span>
      {/each}
    </div>
  </div>

  <!-- Controles de Passo Anterior / Próximo -->
  <div class="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-dark-border/60">
    <button
      type="button"
      onclick={prevChapter}
      disabled={$currentStoryIndex === 0}
      class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all {$currentStoryIndex === 0 ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400' : 'bg-gray-100 dark:bg-dark-card hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-200 border-gray-200 dark:border-dark-border'}"
    >
      <Icon name="chevronLeft" class="w-3.5 h-3.5" />
      <span>Anterior</span>
    </button>

    <!-- Indicador de Bolinhas de Progresso -->
    <div class="flex items-center gap-1.5">
      {#each STORY_CHAPTERS as _, idx}
        <button
          type="button"
          onclick={() => activateChapter(idx)}
          class="w-2.5 h-2.5 rounded-full transition-all {idx === $currentStoryIndex ? 'w-6 bg-gov-blue dark:bg-dark-accent' : 'bg-gray-300 dark:bg-dark-border hover:bg-gray-400'}"
          title="Ir para Capítulo {idx + 1}"
        ></button>
      {/each}
    </div>

    <button
      type="button"
      onclick={nextChapter}
      disabled={$currentStoryIndex === STORY_CHAPTERS.length - 1}
      class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all {$currentStoryIndex === STORY_CHAPTERS.length - 1 ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400' : 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg hover:bg-gov-blue-dark dark:hover:bg-sky-400 border-transparent shadow-sm'}"
    >
      <span>Próximo</span>
      <Icon name="chevronRight" class="w-3.5 h-3.5" />
    </button>
  </div>
</div>

<style>
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-slideUp {
    animation: slideUp 0.25s ease-out forwards;
  }
</style>
