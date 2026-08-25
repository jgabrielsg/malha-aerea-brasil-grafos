<script>
  import { icons } from './index.js';

  let { name = 'plane', size = 24, class: className = '', strokeWidth = 2 } = $props();

  let elements = $derived(icons[name] || icons.plane);
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
>
  {#each elements as [tag, attrs]}
    <svelte:element this={tag} {...attrs} />
  {/each}
</svg>
