<script>
  import { airportsList } from '$lib/stores/dataStore.js';
  import { selectedAirport, cameraTarget } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  let query = $state('');
  let isOpen = $state(false);
  let inputElement;

  let filteredAirports = $derived(
    query.trim().length >= 2
      ? $airportsList.filter(a => {
          const q = query.trim().toLowerCase();
          return (
            a.icao.toLowerCase().includes(q) ||
            (a.iata && a.iata.toLowerCase().includes(q)) ||
            (a.city && a.city.toLowerCase().includes(q)) ||
            (a.state && a.state.toLowerCase().includes(q)) ||
            (a.name && a.name.toLowerCase().includes(q))
          );
        }).slice(0, 8)
      : []
  );

  function handleSelect(airport) {
    selectedAirport.set(airport.icao);
    cameraTarget.set([airport.lon, airport.lat, 7.5]);
    query = `${airport.icao} - ${airport.city || airport.name}`;
    isOpen = false;
  }

  function clearSearch() {
    query = '';
    isOpen = false;
    if (inputElement) inputElement.focus();
  }

  function handleBlur() {
    setTimeout(() => {
      isOpen = false;
    }, 200);
  }
</script>

<div class="relative w-full max-w-sm">
  <div class="relative flex items-center">
    <Icon name="search" class="absolute left-3 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
    <input
      bind:this={inputElement}
      type="text"
      bind:value={query}
      onfocus={() => isOpen = true}
      oninput={() => isOpen = true}
      onblur={handleBlur}
      placeholder="Buscar aeroporto, ICAO, IATA ou cidade..."
      class="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white/95 dark:bg-dark-surface/95 backdrop-blur border border-gray-200 dark:border-dark-border rounded-xl shadow-md text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gov-blue dark:focus:ring-dark-accent transition-all"
    />
    {#if query}
      <button
        type="button"
        onclick={clearSearch}
        class="absolute right-2.5 p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
      >
        <Icon name="x" class="w-3.5 h-3.5" />
      </button>
    {/if}
  </div>

  <!-- Dropdown de Resultados -->
  {#if isOpen && filteredAirports.length > 0}
    <div class="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
      {#each filteredAirports as airport}
        <button
          type="button"
          onclick={() => handleSelect(airport)}
          class="w-full text-left px-3.5 py-2.5 hover:bg-gov-blue/5 dark:hover:bg-dark-accent/10 border-b border-gray-100 dark:border-dark-border/50 last:border-0 flex items-center justify-between gap-3 transition-colors group"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-dark-surface flex items-center justify-center flex-shrink-0 text-gray-600 dark:text-dark-accent group-hover:bg-gov-blue group-hover:text-white transition-colors">
              <Icon name="plane" class="w-3.5 h-3.5 -rotate-45" />
            </div>
            <div class="truncate">
              <div class="flex items-center gap-1.5">
                <span class="font-mono font-bold text-xs text-gray-900 dark:text-white">
                  {airport.icao}
                </span>
                {#if airport.iata}
                  <span class="font-mono text-[10px] px-1 py-0.2 rounded bg-gray-200 dark:bg-dark-surface text-gray-600 dark:text-gray-400">
                    {airport.iata}
                  </span>
                {/if}
                {#if airport.is_capital}
                  <span class="text-[9px] px-1 py-0.2 rounded bg-gov-blue/15 text-gov-blue dark:text-dark-accent font-semibold">
                    CAPITAL
                  </span>
                {/if}
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {airport.city ? `${airport.city} (${airport.state || airport.country})` : airport.name}
              </p>
            </div>
          </div>

          <span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 group-hover:text-gov-blue dark:group-hover:text-dark-accent flex-shrink-0">
            {airport.summary?.total_flights ? `${airport.summary.total_flights.toLocaleString('pt-BR')} voos` : ''}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>
