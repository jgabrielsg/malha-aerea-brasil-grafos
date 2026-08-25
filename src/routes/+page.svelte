<script>
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import FlightMap from '$lib/components/FlightMap.svelte';
  import TimelineController from '$lib/components/TimelineController.svelte';
  import SearchBox from '$lib/components/SearchBox.svelte';
  import AirportPanel from '$lib/components/AirportPanel.svelte';
  import GapInspector from '$lib/components/GapInspector.svelte';
  import { isLoading, loadError } from '$lib/stores/dataStore.js';
  import { selectedAirport } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  let isGapInspectorOpen = $state(false);
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

      <!-- Painel Flutuante Superior: Linha do Tempo e Busca -->
      <div class="absolute top-4 left-4 right-4 sm:right-auto sm:w-[460px] z-30 flex flex-col gap-2.5 pointer-events-none">
        <!-- Campo de Busca -->
        <div class="pointer-events-auto">
          <SearchBox />
        </div>

        <!-- Controlador Temporal (Timeline) -->
        <div class="pointer-events-auto">
          <TimelineController />
        </div>
      </div>

      <!-- Card / Botão do Inspetor de Desertos de Rota (Flutuante inferior esquerdo) -->
      <div class="absolute bottom-4 left-4 z-30 pointer-events-auto">
        <GapInspector bind:isOpen={isGapInspectorOpen} />
      </div>
    </div>

    <!-- Painel Lateral Retrátil de Detalhes do Aeroporto (Ego-Graph) -->
    {#if $selectedAirport}
      <AirportPanel />
    {/if}
  </main>

  <!-- Rodapé Institucional -->
  <Footer />
</div>
