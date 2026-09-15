<script>
  import { onDestroy } from 'svelte';
  import { 
    selectedYear, 
    isPlaying, 
    playbackSpeed, 
    HISTORICAL_MILESTONES 
  } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  const MIN_YEAR = 2000;
  const MAX_YEAR = 2026;

  let timerInterval = null;

  // Controla a expansão dos detalhes
  let isExpanded = $state(false);

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  function togglePlay(event) {
    event.stopPropagation();
    isPlaying.update(p => !p);
  }

  function stepYear(delta, event) {
    event.stopPropagation();

    selectedYear.update(y => {
      const next = y + delta;

      if (next < MIN_YEAR) return MAX_YEAR;
      if (next > MAX_YEAR) return MIN_YEAR;

      return next;
    });
  }

  $effect(() => {
    if ($isPlaying) {
      if (!timerInterval) {
        timerInterval = setInterval(() => {
          selectedYear.update(y => {
            if (y >= MAX_YEAR) {
              return MIN_YEAR;
            }

            return y + 1;
          });
        }, $playbackSpeed);
      }
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  });

  onDestroy(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
  });

  let currentMilestone = $derived(
    HISTORICAL_MILESTONES[$selectedYear]
  );
</script>


<!-- ============================================================= -->
<!-- PAINEL PRINCIPAL -->
<!-- ============================================================= -->

<div class="bg-white/90 dark:bg-dark-surface/90 backdrop-blur border border-gray-200 dark:border-dark-border rounded-xl shadow-sm hover:shadow-md p-2.5 px-3 transition-all">
  <div class="flex flex-col gap-2">

    <!-- ========================================================= -->
    <!-- LINHA SUPERIOR COMPACTA -->
    <!-- ========================================================= -->

    <div class="flex items-center justify-between gap-2">

      <!-- Controles de reprodução -->
      <div class="flex items-center gap-1">
        <!-- Ano anterior -->
        <button
          type="button"
          onclick={(event) => stepYear(-1, event)}
          class="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Ano Anterior"
        >
          <Icon name="chevronLeft" class="w-4 h-4" />
        </button>

        <!-- Play / Pause -->
        <button
          type="button"
          onclick={togglePlay}
          class="flex items-center justify-center w-7 h-7 rounded-lg bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-semibold shadow hover:bg-gov-blue-dark dark:hover:bg-sky-400 transition-all"
          title={$isPlaying ? 'Pausar Reprodução' : 'Reproduzir Evolução Histórica (2000-2026)'}
        >
          {#if $isPlaying}
            <Icon name="pause" class="w-3.5 h-3.5" />
          {:else}
            <Icon name="play" class="w-3.5 h-3.5 ml-0.5" />
          {/if}
        </button>

        <!-- Próximo ano -->
        <button
          type="button"
          onclick={(event) => stepYear(1, event)}
          class="p-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Próximo Ano"
        >
          <Icon name="chevronRight" class="w-4 h-4" />
        </button>
      </div>

      <!-- Área Clicável de Expansão e Ano -->
      <div
        class="flex items-center gap-1.5 px-2 py-0.5 rounded-lg cursor-pointer hover:bg-gray-100/60 dark:hover:bg-dark-card/40 transition-colors select-none"
        onclick={toggleExpanded}
        title={isExpanded ? 'Clique para ocultar detalhes da safra' : 'Clique para exibir slider e marcos históricos'}
      >
        <span class="text-[10px] font-mono font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Safra
        </span>
        <span class="text-xl font-mono font-black text-gov-blue dark:text-dark-accent tracking-tight">
          {$selectedYear}
        </span>
        <span class="text-gray-400 dark:text-gray-500 text-xs font-bold leading-none ml-0.5">
          {isExpanded ? '▴' : '▾'}
        </span>
      </div>

    </div>


    <!-- ========================================================= -->
    <!-- CONTEÚDO EXPANSÍVEL -->
    <!-- ========================================================= -->

    {#if isExpanded}

      <div class="flex flex-col gap-2.5 animate-fadeIn">


        <!-- ======================================================= -->
        <!-- SLIDER CONTÍNUO -->
        <!-- ======================================================= -->

        <div class="relative flex items-center">

          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step="1"
            bind:value={$selectedYear}
            onclick={(event) => event.stopPropagation()}
            class="w-full h-2 bg-gray-200 dark:bg-dark-card rounded-lg appearance-none cursor-pointer accent-gov-blue dark:accent-dark-accent focus:outline-none"
            aria-label="Selecionar ano da linha do tempo"
          />

        </div>


        <!-- ======================================================= -->
        <!-- ESCALA DE ANOS -->
        <!-- ======================================================= -->

        <div
          class="flex justify-between text-[10px] font-mono text-gray-400 dark:text-gray-500 px-0.5"
          onclick={(event) => event.stopPropagation()}
        >

          <span>
            2000
          </span>

          <span class="hidden sm:inline">
            2005
          </span>

          <span>
            2010
          </span>

          <span class="hidden sm:inline">
            2015
          </span>

          <span>
            2020
          </span>

          <span>
            2026
          </span>

        </div>


        <!-- ======================================================= -->
        <!-- MARCO HISTÓRICO -->
        <!-- ======================================================= -->

        {#if currentMilestone}

          <div
            class="flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg bg-gov-blue/5 dark:bg-dark-accent/10 border border-gov-blue/15 dark:border-dark-accent/20 text-gov-blue-dark dark:text-dark-accent animate-fadeIn"
            onclick={(event) => event.stopPropagation()}
          >

            <Icon
              name="info"
              class="w-3.5 h-3.5 flex-shrink-0"
            />

            <span class="truncate font-medium">
              {currentMilestone}
            </span>

          </div>

        {/if}

      </div>

    {/if}

  </div>

</div>


<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(2px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out forwards;
  }
</style>