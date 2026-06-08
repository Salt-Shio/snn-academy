<script setup lang="ts">
import type { NeuronNode, NeuronLink } from '../models/network-models';

const props = defineProps<{
  nodes: NeuronNode[];
  links: NeuronLink[];
  tickCount: number;
  terminalLeafIds: string[];
}>();

/**
 * 計算連線路徑 (帶有微小的動態抖動)
 */
const getLinkD = (link: NeuronLink) => {
  const s = link.source as any;
  const t = link.target as any;
  if (s.x === undefined || t.x === undefined) return "";
  
  // 基於 tickCount 與 ID 長度產生隨機偏移，模擬生物動態感
  const mx = (s.x + t.x) / 2 + (Math.sin(s.id.length + props.tickCount * 0.05) * 2);
  const my = (s.y + t.y) / 2 + (Math.cos(s.id.length + props.tickCount * 0.05) * 2);
  
  return `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`;
};
</script>

<template>
  <g class="dendrite-network-layer">
    <!-- 1. 渲染所有物理連結 -->
    <g stroke-linecap="round" fill="none">
      <path 
        v-for="(l, i) in links" 
        :key="i" 
        :d="getLinkD(l)" 
        :stroke-width="l.width" 
        :stroke="l.target.side === 'left' ? '#9F7AEA' : '#6D28D9'"
        :opacity="0.85 - (l.target.depth * 0.15)" 
      />
    </g>

    <!-- 2. 渲染末梢小球 (Leaf Nodes) -->
    <g fill="#6D28D9">
      <circle 
        v-for="id in terminalLeafIds" 
        :key="id" 
        :cx="nodes.find(n => n.id === id)?.x" 
        :cy="nodes.find(n => n.id === id)?.y" 
        r="6" 
      />
    </g>
  </g>
</template>
