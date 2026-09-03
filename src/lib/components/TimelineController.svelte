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

<div class="bg-white/90 dark:bg-dark-surface/90 backdrop-blur border border-gray-200 dark:border-dark-border rounded-xl shadow-lg p-3 sm:p-4 transition-colors">

  <div class="flex flex-col gap-2.5">


    <!-- ========================================================= -->
    <!-- LINHA SUPERIOR -->
    <!-- ========================================================= -->

    <div
      class="flex items-center justify-between gap-3 -m-1 p-1"
    >


      <!-- ======================================================= -->
      <!-- CONTROLES DE REPRODUÇÃO -->
      <!-- ======================================================= -->

      <div class="flex items-center gap-1.5">


        <!-- Ano anterior -->
        <button
          type="button"
          onclick={(event) => stepYear(-1, event)}
          class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Ano Anterior"
        >

          <Icon
            name="chevronLeft"
            class="w-5 h-5"
          />

        </button>


        <!-- Play / Pause -->
        <button
          type="button"
          onclick={togglePlay}
          class="flex items-center justify-center w-9 h-9 rounded-lg bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-semibold shadow-md hover:bg-gov-blue-dark dark:hover:bg-sky-400 transition-all"
          title={$isPlaying ? 'Pausar Reprodução' : 'Reproduzir Evolução Histórica (2000-2026)'}
        >

          {#if $isPlaying}

            <Icon
              name="pause"
              class="w-4 h-4"
            />

          {:else}

            <Icon
              name="play"
              class="w-4 h-4 ml-0.5"
            />

          {/if}

        </button>


        <!-- Próximo ano -->
        <button
          type="button"
          onclick={(event) => stepYear(1, event)}
          class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card hover:text-gray-900 dark:hover:text-white transition-colors"
          title="Próximo Ano"
        >

          <Icon
            name="chevronRight"
            class="w-5 h-5"
          />

        </button>

      </div>


      <!-- ======================================================= -->
      <!-- ÁREA CLICÁVEL DE EXPANSÃO -->
      <!-- ======================================================= -->

      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50/50 dark:hover:bg-dark-card/30 transition-colors"
        onclick={toggleExpanded}
        title={isExpanded ? 'Clique para ocultar os detalhes' : 'Clique para mostrar os detalhes'}
      >

        <span class="text-xs font-mono font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Safra
        </span>

        <span class="text-2xl sm:text-3xl font-mono font-extrabold text-gov-blue dark:text-dark-accent tracking-tight">
          {$selectedYear}
        </span>

        <!-- Indicador de expansão -->
        <span
          class="text-gray-400 dark:text-gray-500 text-sm font-bold leading-none ml-0.5"
          aria-hidden="true"
        >
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