<script>
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/flightState.js';
  import { loadFlightData } from '$lib/stores/dataStore.js';

  let { children } = $props();

  onMount(() => {
    // Sincroniza tema com localStorage ou preferência do sistema
    const savedTheme = localStorage.getItem('geoflight_theme') || 'dark';
    theme.set(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Carrega os dados estáticos JSON da ANAC
    loadFlightData();
  });
</script>

<div class="flex flex-col h-screen w-screen overflow-hidden bg-gray-50 dark:bg-dark-bg transition-colors">
  {@render children()}
</div>
