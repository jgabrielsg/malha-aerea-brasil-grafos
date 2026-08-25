<script>
  import Icon from '$lib/icons/Icon.svelte';
</script>

<footer class="bg-white/95 dark:bg-dark-surface/95 backdrop-blur border-t border-gray-200 dark:border-dark-border py-2 px-4 text-[11px] text-gray-500 dark:text-gray-400 z-30 flex-shrink-0 transition-colors">
  <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
    <!-- Metadados de Dados e Governança -->
    <div class="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
      <span class="flex items-center gap-1 text-gov-blue dark:text-dark-accent font-semibold">
        <Icon name="database" class="w-3 h-3" />
        <span>Microdados ANAC/VRA</span>
      </span>
      <span class="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
      <span>Série Histórica Consolidada (2000–2026)</span>
      <span class="text-gray-300 dark:text-gray-600 hidden sm:inline">•</span>
      <span class="font-mono">Agosto/2026</span>
    </div>

    <!-- Créditos e Tecnologias -->
    <div class="flex items-center gap-2 text-[10px] font-mono text-gray-400 dark:text-gray-500">
      <span>Modelagem em Grafos (NetworkX) + Deck.gl</span>
      <span class="text-gray-300 dark:text-gray-600">•</span>
      <a
        href="https://github.com/jgabrielsg/malha-aerea-brasil-grafos"
        target="_blank"
        rel="noopener noreferrer"
        class="hover:text-gov-blue dark:hover:text-dark-accent transition-colors flex items-center gap-0.5"
      >
        <Icon name="code" class="w-3 h-3" />
        <span>GeoFlight-BR</span>
      </a>
    </div>
  </div>
</footer>
