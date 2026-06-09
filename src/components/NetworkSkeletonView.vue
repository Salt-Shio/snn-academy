<script setup lang="ts">
import { computed } from 'vue';
import type { VisualNetwork } from '../lib/snn/visual/core/VisualNetwork';
import type { VisualNeuron } from '../lib/snn/visual/core/VisualNeuron';

const props = defineProps<{
  network: VisualNetwork;
}>();

// 將 Map 轉為 Array 方便 Vue 渲染
const neurons = computed(() => Array.from(props.network.neurons.values()));

// 單位 5: 綠線路徑計算
const getDendriteLine = (neuron: VisualNeuron, dendrite: any) => {
  const startX = neuron.cx + neuron.soma.radius * Math.cos(dendrite.angle);
  const startY = neuron.cy + neuron.soma.radius * Math.sin(dendrite.angle);
  const endX = startX + dendrite.length * Math.cos(dendrite.angle);
  const endY = startY + dendrite.length * Math.sin(dendrite.angle);
  return { x1: startX, y1: startY, x2: endX, y2: endY };
};
</script>

<template>
  <div class="skeleton-container bg-slate-900 rounded-2xl p-8 border border-white/5 shadow-2xl">
    <svg viewBox="0 0 1000 600" class="w-full h-auto">
      <!-- 遍歷神經元繪製其內部單位 -->
      <g v-for="neuron in neurons" :key="neuron.id" :id="neuron.id">
        <!-- 單位 4: 黑斜線 (突觸連線 - 從發射端小圓出發) -->
        <line 
          v-for="conn in neuron.outgoingConnections" 
          :key="conn.id"
          :x1="conn.startPoint.x" 
          :y1="conn.startPoint.y"
          :x2="conn.endPoint.x" 
          :y2="conn.endPoint.y"
          stroke="#475569" 
          stroke-width="1.5"
          stroke-dasharray="4"
        />

        <!-- 單位 2: 紅直線 (軸突) -->
        <line 
          :x1="neuron.getAxonLine().start.x" 
          :y1="neuron.getAxonLine().start.y"
          :x2="neuron.getAxonLine().end.x" 
          :y2="neuron.getAxonLine().end.y"
          stroke="#ef4444" 
          stroke-width="3"
        />

        <!-- 單位 5: 綠線 (樹突輸入) -->
        <line 
          v-for="(d, idx) in neuron.dendrites" 
          :key="idx"
          v-bind="getDendriteLine(neuron, d)"
          stroke="#10b981" 
          stroke-width="3"
        />

        <!-- 單位 3: 小紅圓 (突觸末梢) -->
        <circle 
          :cx="neuron.getTerminalPosition().x" 
          :cy="neuron.getTerminalPosition().y" 
          :r="neuron.terminal.radius"
          fill="#0f172a" 
          stroke="#ef4444" 
          stroke-width="2"
        />

        <!-- 單位 1: 大紅圓 (細胞本體) -->
        <circle 
          :cx="neuron.cx" 
          :cy="neuron.cy" 
          :r="neuron.soma.radius"
          :fill="neuron.isSpiking ? '#ef4444' : '#0f172a'" 
          :stroke="neuron.isSpiking ? '#fca5a5' : '#ef4444'" 
          stroke-width="3"
          class="transition-colors duration-200"
        />
        
        <!-- ID 標籤 -->
        <text :x="neuron.cx" :y="neuron.cy + neuron.soma.radius + 15" text-anchor="middle" class="fill-slate-500 text-[10px] font-mono">
          {{ neuron.id }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
svg {
  filter: drop-shadow(0 0 10px rgba(0,0,0,0.3));
}
</style>
