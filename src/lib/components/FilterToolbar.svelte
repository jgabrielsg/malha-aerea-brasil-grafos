<script>
  import { 
    minFlightThresholdIndex, 
    onlyDomestic, 
    selectedDistanceBracket,
    FREQUENCY_LEVELS
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

  function selectDistance(dist) {
    selectedDistanceBracket.set(dist);
  }
</script>

<div class="bg-white/90 dark:bg-dark-surface/90 backdrop-blur border border-gray-200 dark:border-dark-border rounded-xl shadow-sm hover:shadow-md p-2.5 px-3 transition-all">
  <div class="flex flex-col gap-2">

    <!-- Cabeçalho Compacto (Barra recolhida) -->
    <div class="flex items-center justify-between gap-2">

      <!-- Botão Filtros -->
      <button
        type="button"
        onclick={() => filtersOpen = !filtersOpen}
        class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200 font-mono hover:text-gov-blue dark:hover:text-dark-accent transition-colors select-none"
        aria-expanded={filtersOpen}
        aria-controls="frequency-filters"
      >
        <div class="w-5 h-5 rounded-md bg-gov-blue/10 dark:bg-dark-accent/15 flex items-center justify-center text-gov-blue dark:text-dark-accent">
          <Icon name="sliders" class="w-3 h-3" />
        </div>

        <span>Filtros</span>

        <span class="text-[10px] px-1 py-0.2 rounded bg-gov-blue/10 dark:bg-dark-accent/15 text-gov-blue dark:text-dark-accent font-semibold lowercase">
          {activeLevel.label}
        </span>

        <span class="text-[9px] text-gray-400 dark:text-gray-500">
          {filtersOpen ? '▲' : '▼'}
        </span>
      </button>

      <!-- Switch de Rotas Nacionais (Apenas BR) -->
      <div class="flex items-center gap-1.5">
        <label
          for="toggle-domestic"
          class="text-xs font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none"
        >
          Apenas BR
        </label>

        <button
          id="toggle-domestic"
          type="button"
          role="switch"
          aria-checked={$onlyDomestic}
          onclick={toggleDomestic}
          class="relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none {$onlyDomestic ? 'bg-gov-blue dark:bg-dark-accent' : 'bg-gray-300 dark:bg-gray-700'}"
          title={$onlyDomestic ? 'Filtrando apenas aeroportos brasileiros (BR ↔ BR)' : 'Exibindo rotas nacionais e internacionais'}
        >
          <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {$onlyDomestic ? 'translate-x-3 dark:bg-dark-bg' : 'translate-x-0'}"
          ></span>
        </button>
      </div>
    </div>

    <!-- Conteúdo dos Filtros (Expansível) -->
    {#if filtersOpen}
      <div
        id="frequency-filters"
        class="flex flex-col gap-2.5 border-t border-gray-100 dark:border-dark-border/60 pt-2.5 animate-fadeIn"
      >
        <!-- 1. Frequência Operacional -->
        <div class="flex flex-col gap-1">
          <div class="flex items-center justify-between gap-1.5 text-[11px]">
            <div class="flex items-center gap-1 text-gray-600 dark:text-gray-400 font-medium">
              <Icon name="activity" class="w-3 h-3 text-amber-500" />
              <span>Frequência mínima:</span>
            </div>
            <span class="font-mono text-[10px] font-bold text-gov-blue dark:text-dark-accent">
              {activeLevel.text}
            </span>
          </div>

          <div class="flex items-center justify-between text-[10px] text-gray-400">
            <span class="truncate italic">{activeLevel.meaning}</span>
            <span class="font-mono flex-shrink-0 ml-2">{$currentRoutes.length.toLocaleString('pt-BR')} rotas</span>
          </div>

          <!-- Slider de 7 degraus -->
          <div class="relative flex items-center mt-0.5">
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={$minFlightThresholdIndex}
              oninput={handleSliderInput}
              class="w-full h-1.5 bg-gray-200 dark:bg-dark-card rounded-lg appearance-none cursor-pointer accent-gov-blue dark:accent-dark-accent focus:outline-none"
              aria-label="Frequência mínima de voos"
            />
          </div>

          <!-- Ticks -->
          <div class="flex justify-between text-[9px] font-mono px-0.5 select-none text-gray-400 dark:text-gray-500">
            {#each FREQUENCY_LEVELS as level, idx}
              <button
                type="button"
                onclick={() => selectLevel(idx)}
                class="hover:text-gov-blue dark:hover:text-dark-accent transition-colors {idx === $minFlightThresholdIndex ? 'font-bold text-gov-blue dark:text-dark-accent' : ''}"
                title="{level.text} — {level.meaning}"
              >
                {level.label}
              </button>
            {/each}
          </div>
        </div>

        <!-- 2. Filtro de Extensão de Voo (Distance Brackets) -->
        <div class="flex flex-col gap-1 pt-2 border-t border-gray-100 dark:border-dark-border/40">
          <div class="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-400">
            <div class="flex items-center gap-1 font-medium">
              <Icon name="compass" class="w-3 h-3 text-sky-500" />
              <span>Extensão da rota:</span>
            </div>
            <span class="font-mono text-[10px] text-gray-500 dark:text-gray-400">
              {$selectedDistanceBracket === 'all' ? 'Todas' : $selectedDistanceBracket === 'short' ? '<600 km' : $selectedDistanceBracket === 'medium' ? '600–1.500 km' : '>1.500 km'}
            </span>
          </div>

          <div class="grid grid-cols-4 gap-1 text-[10px] font-mono mt-0.5">
            <button
              type="button"
              onclick={() => selectDistance('all')}
              class="py-1 rounded border text-center transition-all {$selectedDistanceBracket === 'all' ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-xs' : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-border hover:bg-gray-200'}"
              title="Todas as distâncias de voo"
            >
              Todas
            </button>
            <button
              type="button"
              onclick={() => selectDistance('short')}
              class="py-1 rounded border text-center transition-all {$selectedDistanceBracket === 'short' ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-xs' : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-border hover:bg-gray-200'}"
              title="Voos regionais de curto alcance (< 600 km)"
            >
              &lt; 600km
            </button>
            <button
              type="button"
              onclick={() => selectDistance('medium')}
              class="py-1 rounded border text-center transition-all {$selectedDistanceBracket === 'medium' ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-xs' : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-border hover:bg-gray-200'}"
              title="Voos de médio curso (600 a 1.500 km)"
            >
              600-1.5k
            </button>
            <button
              type="button"
              onclick={() => selectDistance('long')}
              class="py-1 rounded border text-center transition-all {$selectedDistanceBracket === 'long' ? 'bg-gov-blue dark:bg-dark-accent text-white dark:text-dark-bg font-bold border-transparent shadow-xs' : 'bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-400 border-gray-200 dark:border-dark-border hover:bg-gray-200'}"
              title="Voos de longo curso / transcontinentais (> 1.500 km)"
            >
              &gt; 1.500km
            </button>
          </div>
        </div>

      </div>
    {/if}

  </div>
</div>

<style>
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(2px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out forwards;
  }
</style>