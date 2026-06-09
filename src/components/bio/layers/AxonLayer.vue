<script setup lang="ts">
import { ref } from 'vue';
import type { MyelinPoint } from '../models/network-models';

defineProps<{
  axonD: string;
  myelinPoints: MyelinPoint[];
}>();

const pathRef = ref<SVGPathElement | null>(null);

// 暴露路徑引用，以便父組件進行幾何計算 (updateMyelin)
defineExpose({
  pathRef
});
</script>

<template>
  <g class="axon-layer">
    <!-- 1. 軸突主幹 -->
    <path 
      ref="pathRef" 
      :d="axonD" 
      stroke="#7C3AED" 
      stroke-width="8" 
      fill="none" 
      stroke-linecap="round" 
    />

    <!-- 2. 髓鞘系統 -->
    <g 
      v-for="(p, i) in myelinPoints" 
      :key="i" 
      :transform="`translate(${p.x}, ${p.y}) rotate(${p.angle})`"
    >
      <rect 
        :x="-p.width/2" 
        y="-14" 
        :width="p.width" 
        height="28" 
        rx="12" 
        fill="url(#myelinGrad)" 
        stroke="#B45309" 
        stroke-width="1.5" 
      />
      <!-- 蘭氏節核心標記 -->
      <circle :cx="p.width * 0.1" cy="0" r="3.5" fill="#78350F" opacity="0.7" />
    </g>
  </g>
</template>
