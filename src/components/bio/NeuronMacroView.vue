<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import * as d3 from 'd3';

// 導入模型
import type { NeuronNode } from './models/network-models';

// 導入領域邏輯 (Physics & Geometry)
import { useNetworkPhysics } from './physics/useNetworkPhysics';
import { useAxonGeometry } from './geometry/useAxonGeometry';

// 導入視覺圖層 (Layers)
import SomaLayer from './layers/SomaLayer.vue';
import TerminalRootLayer from './layers/TerminalRootLayer.vue';
import DendriteLayer from './layers/DendriteLayer.vue';
import AxonLayer from './layers/AxonLayer.vue';

// --- 1. 核心狀態與邏輯初始化 ---
const showLabels = ref(true);
const isFiring = ref(false);
const svgRef = ref<SVGSVGElement | null>(null);
const axonLayerRef = ref<any>(null);

const { 
  nodes, 
  links, 
  somaNode, 
  terminalRootNode, 
  tickCount, 
  simulation, 
  initNeuronData, 
  startSimulation, 
  dragBehavior 
} = useNetworkPhysics();

const { 
  axonPathRef, 
  myelinPoints, 
  axonD, 
  updateMyelin 
} = useAxonGeometry(somaNode, terminalRootNode, tickCount);

// 同步子組件中的 SVG Path 引用到幾何運算邏輯中
watch(() => axonLayerRef.value?.pathRef, (el) => {
  if (el) axonPathRef.value = el;
});

// --- 2. 計算屬性 ---
// 精確找出右側末梢的葉子節點
const terminalLeafIds = computed(() => {
  const _ = tickCount.value;
  const sources = new Set(links.value.map(l => (typeof l.source === 'string' ? l.source : (l.source as any).id)));
  return nodes.value
    .filter(n => n.type === 'terminal' && !n.id.startsWith('t-root') && !sources.has(n.id))
    .map(n => n.id);
});

// --- 3. 動作互動 ---
const triggerSpike = () => {
  if (isFiring.value) return;
  isFiring.value = true;
  setTimeout(() => isFiring.value = false, 1200);
};

// --- 4. 生命週期 ---
onMounted(() => {
  // 初始化單一神經元資料 (ID 為 'n1')
  initNeuronData('n1');

  // 延遲啟動模擬以確保 DOM 已掛載
  setTimeout(() => {
    startSimulation(() => {
      // 每一幀更新時執行的額外邏輯
      updateMyelin();
    });

    // 綁定拖拽行為
    if (svgRef.value && simulation) {
      const d = dragBehavior(simulation);
      d3.select(svgRef.value).selectAll<SVGElement, NeuronNode>(".draggable")
        .data(nodes.value.filter(n => n.type === 'soma' || n.id.startsWith('t-root')), d => d.id)
        .call(d);
    }
  }, 100);
});

onUnmounted(() => {
  if (simulation) simulation.stop();
});
</script>

<template>
  <div class="neuron-viewport w-full h-[85vh] bg-[#020617] flex items-center justify-center overflow-hidden font-sans">
    <!-- UI 控制區 -->
    <div class="absolute top-28 right-12 flex gap-4 z-50">
      <button @click="showLabels = !showLabels" class="px-6 py-2 rounded-full border border-white/10 bg-white/5 text-white/30 text-[10px] font-black tracking-widest hover:text-white transition-all uppercase">
        {{ showLabels ? 'Hide Labels' : 'Show Labels' }}
      </button>
      <button @click="triggerSpike" class="px-10 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black tracking-widest active:scale-95 transition-all uppercase shadow-lg shadow-indigo-500/20">
        Pulse
      </button>
    </div>

    <!-- SVG 畫布 -->
    <div class="w-[1150px] h-[650px] relative">
      <svg ref="svgRef" viewBox="0 0 1150 650" class="w-full h-full drop-shadow-2xl !pointer-events-auto">
        <defs>
          <linearGradient id="myelinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FDE68A" /><stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <filter id="spikeGlow"><feGaussianBlur stdDeviation="4" /><feComposite in="SourceGraphic" operator="over" /></filter>
        </defs>

        <!-- 圖層 1: 樹突網與末梢 (底層) -->
        <DendriteLayer :nodes="nodes" :links="links" :tick-count="tickCount" :terminal-leaf-ids="terminalLeafIds" />

        <!-- 圖層 2: 軸突與髓鞘 (中層) -->
        <AxonLayer ref="axonLayerRef" :axon-d="axonD" :myelin-points="myelinPoints" />

        <!-- 圖層 3: 細胞本體 (頂層) -->
        <SomaLayer :soma-node="somaNode" />

        <!-- 圖層 4: 拖拽輔助點 (隱形) -->
        <TerminalRootLayer :terminal-root-node="terminalRootNode" />

        <!-- 圖層 5: 脈衝動畫 (覆蓋層) -->
        <circle v-if="isFiring" r="12" fill="#FFF" filter="url(#spikeGlow)">
          <animateMotion dur="1.2s" repeatCount="1" :path="axonD" />
        </circle>

        <!-- 圖層 6: 標籤層 -->
        <g v-if="showLabels" class="labels text-[10px] font-black tracking-widest fill-white/10 uppercase italic">
          <text :x="(somaNode?.x || 0) - 200" :y="(somaNode?.y || 0) - 250">Dynamic_Network</text>
          <text :x="(terminalRootNode?.x || 0) - 50" :y="(terminalRootNode?.y || 0) + 220">Terminal_Boutons</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
/* 確保 SVG 內部的 draggable 元素能接收滑鼠事件，其餘穿透 */
svg { pointer-events: none; }
svg * { pointer-events: none; }
:deep(.draggable) { pointer-events: auto !important; cursor: move; }
</style>
