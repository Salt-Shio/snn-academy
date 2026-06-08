<script setup lang="ts">
import type { NeuronNode } from '../models/network-models';

defineProps<{
  somaNode: NeuronNode | null;
}>();
</script>

<template>
  <g v-if="somaNode" class="soma-layer draggable cursor-move">
    <!-- 外層光暈/主體 -->
    <circle :cx="somaNode.x" :cy="somaNode.y" r="55" fill="#8B5CF6" stroke="#6D28D9" stroke-width="4" />
    <!-- 細胞核內層 -->
    <circle :cx="somaNode.x" :cy="somaNode.y + 5" r="32" fill="#311B92" />
    <circle :cx="somaNode.x" :cy="somaNode.y + 5" r="18" fill="#4527A0" />
    <!-- 反光效果 -->
    <circle :cx="somaNode.x - 8" :cy="somaNode.y - 2" r="8" fill="#FFF" opacity="0.1" />
  </g>
</template>

<style scoped>
.draggable { cursor: move; pointer-events: auto; }
</style>
