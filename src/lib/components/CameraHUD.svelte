<script>
  import { onMount } from 'svelte';
  import { 
    cameraTarget, 
    is3DMode, 
    isKeyboardHelpOpen, 
    isExportModalOpen 
  } from '$lib/stores/flightState.js';
  import Icon from '$lib/icons/Icon.svelte';

  let isFullscreen = $state(false);

  function resetToBrazil() {
    cameraTarget.set([-52.0, -14.5, 4.2, $is3DMode ? 32 : 0, 0]);
  }

  function toggle3D() {
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
  }

  function toggleFullscreen() {
    if (typeof document === 'undefined') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Erro ao ativar tela cheia:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  onMount(() => {
    const handleFullscreenChange = () => {
      isFullscreen = Boolean(document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  });
</script>

<div class="absolute top-4 right-4 z-30 flex items-center gap-1.5 p-1.5 rounded-xl bg-white/90 dark:bg-dark-surface/90 backdrop-blur-md border border-gray-200 dark:border-dark-border shadow-xl select-none">
  <!-- Botão Recentralizar Brasil -->
  <button
    type="button"
    onclick={resetToBrazil}
    class="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg text-gray-700 dark:text-gray-200 hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 hover:text-gov-blue dark:hover:text-dark-accent transition-colors"
    title="Recentralizar Visão Panorâmica do Brasil (Tecla R)"
  >
    <Icon name="compass" class="w-3.5 h-3.5 text-gov-blue dark:text-dark-accent" />
    <span class="hidden md:inline">Brasil</span>
  </button>

  <div class="h-4 w-[1px] bg-gray-200 dark:bg-dark-border"></div>

  <!-- Botão Alternar 2D / 3D -->
  <button
    type="button"
    onclick={toggle3D}
    class="flex items-center gap-1 px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg transition-all {$is3DMode ? 'bg-gov-blue/15 text-gov-blue dark:text-dark-accent border border-gov-blue/30 dark:border-dark-accent/30' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card'}"
    title="Alternar entre Perspectiva 3D e Visão 2D Ortogonal (Tecla T)"
  >
    <Icon name="globe" class="w-3.5 h-3.5" />
    <span>{$is3DMode ? '3D' : '2D'}</span>
  </button>

  <div class="h-4 w-[1px] bg-gray-200 dark:bg-dark-border"></div>

  <!-- Botão Exportar / Capturar -->
  <button
    type="button"
    onclick={() => isExportModalOpen.set(true)}
    class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gov-blue dark:hover:text-dark-accent hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 transition-colors"
    title="Exportar Snapshot em PNG ou Tabela CSV"
  >
    <Icon name="camera" class="w-4 h-4" />
  </button>

  <!-- Botão Tela Cheia -->
  <button
    type="button"
    onclick={toggleFullscreen}
    class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gov-blue dark:hover:text-dark-accent hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 transition-colors"
    title={isFullscreen ? 'Sair da Tela Cheia' : 'Entrar em Tela Cheia'}
  >
    <Icon name={isFullscreen ? 'minimize' : 'maximize'} class="w-4 h-4" />
  </button>

  <!-- Botão Atalhos de Teclado -->
  <button
    type="button"
    onclick={() => isKeyboardHelpOpen.set(true)}
    class="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gov-blue dark:hover:text-dark-accent hover:bg-gov-blue/10 dark:hover:bg-dark-accent/15 transition-colors"
    title="Guia de Atalhos do Teclado (Tecla ?)"
  >
    <Icon name="keyboard" class="w-4 h-4" />
  </button>
</div>
