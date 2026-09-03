<script>
  import { 
    minFlightThresholdIndex, 
    onlyDomestic, 
    FREQUENCY_LEVELS,
    isRoutePlannerOpen
  } from '$lib/stores/flightState.js';
  import { currentRoutes } from '$lib/stores/dataStore.js';
  import Icon from '$lib/icons/Icon.svelte';

  let filtersOpen = $state(false);

  // Nível de frequência ativo derivado do índice da store
  let activeLevel = $derived(
    FREQUENCY_LEVELS[$minFlightThresholdIndex] || FREQUENCY_LEVELS[3]
  );

  function handleSliderInput(event) {
    minFlightThresholdIndex.set(Number(event.target.value));
  }

  function toggleDomestic() {
    onlyDomestic.update(v => !v);
  }

  function selectLevel(idx) {
    minFlightThresholdIndex.set(idx);
  }
</script>

<div class="bg-white/90 dark:bg-dark-surface/90 backdrop-blur border border-gray-200 dark:border-dark-border rounded-xl shadow-lg p-3 sm:p-4 transition-colors">

  <div class="flex flex-col gap-3">

    <!-- Cabeçalho -->
    <div class="flex items-center justify-between gap-3">

      <!-- Título e Itinerários -->
      <div class="flex items-center gap-2">

        <!-- Botão Filtros -->
        <button
          type="button"
          onclick={() => filtersOpen = !filtersOpen}
          class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 font-mono hover:text-gov-blue dark:hover:text-dark-accent transition-colors"
          aria-expanded={filtersOpen}
          aria-controls="frequency-filters"
        >
          <div class="w-6 h-6 rounded-lg bg-gov-blue/10 dark:bg-dark-accent/15 flex items-center justify-center text-gov-blue dark:text-dark-accent">
            <Icon name="sliders" class="w-3.5 h-3.5" />
          </div>

          <span>Filtros</span>

          <span class="text-[9px] text-gray-400 dark:text-gray-500">
            {filtersOpen ? '▲' : '▼'}
          </span>
        </button>

        <!-- Itinerários -->
        <button
          type="button"
          onclick={() => isRoutePlannerOpen.update(v => !v)}
          class="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium transition-colors {$isRoutePlannerOpen ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold shadow-sm' : 'bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent hover:bg-gov-blue/20'}"
          title={$isRoutePlannerOpen ? 'Fechar Planejador de Rotas' : 'Abrir Planejador de Rotas Multi-Escala'}
        >
          <Icon name="route" class="w-3 h-3" />
          <span>Itinerários</span>
        </button>

      </div>

      <!-- Switch de rotas nacionais -->
      <div class="flex items-center gap-2">

        <label
          for="toggle-domestic"
          class="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none"
        >
          Apenas rotas nacionais
        </label>

        <button
          id="toggle-domestic"
          type="button"
          role="switch"
          aria-checked={$onlyDomestic}
          onclick={toggleDomestic}
          class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none {$onlyDomestic ? 'bg-gov-blue dark:bg-dark-accent' : 'bg-gray-300 dark:bg-gray-700'}"
          title={$onlyDomestic ? 'Filtrando apenas conexões entre aeroportos nacionais (BR ↔ BR)' : 'Exibindo malha nacional e conexões internacionais'}
        >
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {$onlyDomestic ? 'translate-x-4 dark:bg-dark-bg' : 'translate-x-0'}"
          ></span>
        </button>

      </div>
    </div>


    <!-- Conteúdo dos filtros -->
    {#if filtersOpen}

      <div
        id="frequency-filters"
        class="flex flex-col gap-1.5 border-t border-gray-100 dark:border-dark-border/60 pt-3"
      >

        <!-- Linha Informativa -->
        <div class="flex items-center justify-between gap-2">

          <div class="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
            <Icon name="activity" class="w-3.5 h-3.5 text-amber-500" />
            <span class="font-medium">Frequência mínima:</span>
          </div>

          <!-- Badge -->
          <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gov-blue/10 dark:bg-dark-accent/15 border border-gov-blue/20 dark:border-dark-accent/30 text-gov-blue dark:text-dark-accent font-mono text-xs font-bold">
            <span>{activeLevel.text}</span>
          </div>

        </div>


        <!-- Significado e quantidade de rotas -->
        <div class="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">

          <span class="truncate italic">
            {activeLevel.meaning}
          </span>

          <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
            {$currentRoutes.length.toLocaleString('pt-BR')} rotas
          </span>

        </div>


        <!-- Slider -->
        <div class="relative flex items-center mt-1">

          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={$minFlightThresholdIndex}
            oninput={handleSliderInput}
            class="w-full h-2 bg-gray-200 dark:bg-dark-card rounded-lg appearance-none cursor-pointer accent-gov-blue dark:accent-dark-accent focus:outline-none"
            aria-label="Controle de frequência mínima de voos"
          />

        </div>


        <!-- Ticks -->
        <div class="flex justify-between text-[10px] font-mono px-0.5 mt-0.5 select-none">

          {#each FREQUENCY_LEVELS as level, idx}

            <button
              type="button"
              onclick={() => selectLevel(idx)}
              class="flex flex-col items-center group transition-colors {idx === $minFlightThresholdIndex ? 'font-bold text-gov-blue dark:text-dark-accent' : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}"
              title="{level.text} — {level.meaning}"
            >

              <span
                class="w-1 h-1 rounded-full mb-1 transition-colors {idx === $minFlightThresholdIndex ? 'bg-gov-blue dark:bg-dark-accent ring-2 ring-gov-blue/30 dark:ring-dark-accent/30' : 'bg-gray-300 dark:bg-dark-border group-hover:bg-gray-400 dark:group-hover:bg-gray-500'}"
              ></span>

              <span class="leading-none">
                {level.label}
              </span>

            </button>

          {/each}

        </div>

      </div>

    {/if}

  </div>
</div>