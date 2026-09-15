<script>
  import { isKeyboardHelpOpen } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  function closeModal() {
    isKeyboardHelpOpen.set(false);
  }

  const SHORTCUTS = [
    { key: 'Espaço', action: 'Reproduzir / Pausar animação histórica da malha aérea' },
    { key: '← / →', action: 'Retroceder / Avançar safra anual na linha do tempo' },
    { key: 'P', action: 'Abrir / Fechar Planejador de Itinerários Multi-Escala' },
    { key: 'F', action: 'Abrir / Fechar Simulação de Falhas e Resiliência (What-If)' },
    { key: 'G', action: 'Inspecionar Desertos de Rota (Capitais desconectadas)' },
    { key: 'H', action: 'Ativar / Desativar Modo Narrativa Histórica (Story Mode)' },
    { key: 'R', action: 'Recentralizar câmera na visão panorâmica do Brasil' },
    { key: 'T', action: 'Alternar entre Perspectiva 3D e Visão Ortogonal 2D' },
    { key: 'Esc', action: 'Fechar painéis abertos e restaurar foco global da malha' },
    { key: '?', action: 'Abrir ou ocultar este guia de atalhos' }
  ];
</script>

{#if $isKeyboardHelpOpen}
  <div 
    class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    onclick={closeModal}
    onkeydown={(e) => { if (e.key === 'Escape') closeModal(); }}
  >
    <div 
      class="w-full max-w-lg bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl shadow-2xl overflow-hidden"
      role="none"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Cabeçalho do Modal -->
      <div class="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-gray-50 dark:bg-dark-card/50">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-gov-blue/15 dark:bg-dark-accent/20 text-gov-blue dark:text-dark-accent flex items-center justify-center">
            <Icon name="keyboard" class="w-4 h-4" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-gray-900 dark:text-white font-mono">
              Atalhos de Teclado Operacionais
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Controle rápido do GeoFlight-BR estilo terminal aeroespacial
            </p>
          </div>
        </div>

        <button
          type="button"
          onclick={closeModal}
          class="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
        >
          <Icon name="x" class="w-4 h-4" />
        </button>
      </div>

      <!-- Tabela de Atalhos -->
      <div class="p-4 max-h-[60vh] overflow-y-auto divide-y divide-gray-100 dark:divide-dark-border/40">
        {#each SHORTCUTS as item}
          <div class="py-2.5 flex items-center justify-between gap-4 text-xs">
            <span class="text-gray-700 dark:text-gray-300">
              {item.action}
            </span>
            <kbd class="px-2.5 py-1 text-[11px] font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-md shadow-sm flex-shrink-0">
              {item.key}
            </kbd>
          </div>
        {/each}
      </div>

      <!-- Rodapé do Modal -->
      <div class="p-3 bg-gray-50 dark:bg-dark-card/30 border-t border-gray-100 dark:border-dark-border/50 text-center text-[11px] text-gray-500 dark:text-gray-400 font-mono">
        Pressione <kbd class="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-dark-card text-gray-700 dark:text-gray-300">Esc</kbd> para fechar este guia
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .animate-fadeIn {
    animation: fadeIn 0.15s ease-out forwards;
  }
</style>
