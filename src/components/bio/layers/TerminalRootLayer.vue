<script setup lang="ts">
import type { NeuronNode } from '../models/network-models';

defineProps<{
  terminalRootNode: NeuronNode | null;
}>();
</script>

<template>
  <!-- 軸突末端根部 (隱形可拖拽區域) -->
  <circle 
    v-if="terminalRootNode" 
    class="terminal-root-layer draggable cursor-move"
    :cx="terminalRootNode.x" 
    :cy="terminalRootNode.y" 
    r="40" 
    fill="transparent" 
  />
</template>

<style scoped>
.draggable { cursor: move; pointer-events: auto; }
</style>
