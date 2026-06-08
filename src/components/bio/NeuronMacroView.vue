<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef, computed, watch, nextTick } from 'vue';
import * as d3 from 'd3';

// --- 狀態與引用 ---
const showLabels = ref(true);
const isFiring = ref(false);
const axonPathRef = ref<SVGPathElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);
const myelinPoints = ref<{ x: number, y: number, angle: number, width: number }[]>([]);

const somaNode = ref<NeuronNode | null>(null);
const terminalRootNode = ref<NeuronNode | null>(null);

// --- D3 物理模擬資料結構 ---
interface NeuronNode extends d3.SimulationNodeDatum {
  id: string;
  depth: number;
  side: 'left' | 'right' | 'core';
  type: 'soma' | 'dendrite' | 'terminal';
}

interface NeuronLink extends d3.SimulationLinkDatum<NeuronNode> {
  source: any;
  target: any;
  width: number;
}

const nodes = shallowRef<NeuronNode[]>([]);
const links = shallowRef<NeuronLink[]>([]);
const tickCount = ref(0);
let simulation: d3.Simulation<NeuronNode, NeuronLink> | null = null;

// --- 初始化資料 ---
const initData = () => {
  const n: NeuronNode[] = [];
  const l: NeuronLink[] = [];

  // 1. Soma (不再硬性固定，改用較強的引力)
  const soma: NeuronNode = { id: 'soma', depth: 0, side: 'core', type: 'soma', x: 250, y: 300 };
  somaNode.value = soma;
  n.push(soma);

  // 2. 遞迴生成左側樹突
  const growLeft = (p: NeuronNode, d: number) => {
    if (d >= 4) return;
    const count = d === 0 ? 6 : (Math.random() > 0.4 ? 2 : 1);
    for (let i = 0; i < count; i++) {
      const c: NeuronNode = { id: `L-${p.id}-${d}-${i}`, depth: d + 1, side: 'left', type: 'dendrite', x: p.x - 20, y: p.y };
      n.push(c);
      l.push({ source: p.id, target: c.id, width: 14 * Math.pow(0.52, d) });
      growLeft(c, d + 1);
    }
  };
  growLeft(soma, 0);

  // 3. 軸突末端根部
  const terminalRoot: NeuronNode = { id: 't-root', depth: 0, side: 'core', type: 'terminal', x: 900, y: 380 };
  terminalRootNode.value = terminalRoot;
  n.push(terminalRoot);

  // 4. 遞迴生成右側末梢
  const growRight = (p: NeuronNode, d: number) => {
    if (d >= 2) return;
    const count = d === 0 ? 4 : 2; 
    for (let i = 0; i < count; i++) {
      const c: NeuronNode = { id: `R-${p.id}-${d}-${i}`, depth: d + 1, side: 'right', type: 'terminal', x: p.x + 20, y: p.y };
      n.push(c);
      l.push({ source: p.id, target: c.id, width: 6 * Math.pow(0.7, d) });
      growRight(c, d + 1);
    }
  };
  growRight(terminalRoot, 0);

  nodes.value = n;
  links.value = l;
};

// --- 計算屬性：動態軸突路徑 ---
const axonD = computed(() => {
  const _ = tickCount.value;
  const s = somaNode.value;
  const t = terminalRootNode.value;
  if (!s || !t || s.x === undefined || t.x === undefined) return "";

  const dx = t.x - s.x;
  const dy = t.y - s.y;

  const cp1x = s.x + dx * 0.307;
  const cp1y = s.y + dy * 0.25;
  const cp2x = s.x + dx * 0.615;
  const cp2y = s.y + dy * 2.25;

  return `M ${s.x} ${s.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${t.x} ${t.y}`;
});

// --- 計算屬性：精確找出右側末梢的葉子節點 ---
const terminalLeafIds = computed(() => {
  const _ = tickCount.value;
  const sources = new Set(links.value.map(l => (typeof l.source === 'string' ? l.source : l.source.id)));
  return nodes.value
    .filter(n => n.type === 'terminal' && n.id !== 't-root' && !sources.has(n.id))
    .map(n => n.id);
});

// --- 拖拽行為 ---
const dragBehavior = (sim: d3.Simulation<NeuronNode, NeuronLink>) => {
  return d3.drag<any, NeuronNode>()
    .on("start", (event) => {
      if (!event.active) sim.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on("drag", (event) => {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    })
    .on("end", (event) => {
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    });
};

// --- 啟動模擬 ---
const startSim = () => {
  if (simulation) simulation.stop();

  simulation = d3.forceSimulation<NeuronNode>(nodes.value)
    .force("link", d3.forceLink<NeuronNode, NeuronLink>(links.value).id(d => d.id).distance(45).strength(1))
    .force("charge", d3.forceManyBody().strength(-100))
    .force("x", d3.forceX<NeuronNode>(d => d.id === 'soma' ? 250 : (d.id === 't-root' ? 900 : d.x!)).strength(0.08))
    .force("y", d3.forceY<NeuronNode>(d => d.id === 'soma' ? 300 : (d.id === 't-root' ? 380 : d.y!)).strength(0.08))
    .force("radialLeft", d3.forceRadial(250, 250, 300).strength(d => d.side === 'left' ? 0.2 : 0))
    .force("radialRight", d3.forceRadial(150, 900, 380).strength(d => d.side === 'right' ? 0.4 : 0))
    .alphaDecay(0.01);

  simulation.on("tick", () => {
    tickCount.value++;
    updateMyelin(); 
  });

  if (svgRef.value) {
    const d = dragBehavior(simulation);
    d3.select(svgRef.value).selectAll<SVGElement, NeuronNode>(".draggable")
      .data(nodes.value.filter(n => n.id === 'soma' || n.id === 't-root'), d => d.id)
      .call(d);
  }
};
const updateMyelin = () => {
  if (!axonPathRef.value) return;
  try {
    const path = axonPathRef.value;
    const len = path.getTotalLength();
    const pts = [];
    const count = 11; // 稍微減少一個，讓間距更自然
    const startOffset = len * 0.18; // 增加起始偏移，留出「軸丘 (Axon Hillock)」空間
    const endOffset = len * 0.92;   // 保持尾部覆蓋
    const usableLen = endOffset - startOffset;
    const step = usableLen / (count - 1);

    for (let i = 0; i < count; i++) {
      const d = startOffset + (i * step);
      const p1 = path.getPointAtLength(d);
      const p2 = path.getPointAtLength(Math.min(d + 2, len));
      const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

      const segmentWidth = step * 0.85; // 稍微增加一點間隙感
      pts.push({ x: p1.x, y: p1.y, angle: ang, width: segmentWidth });
    }
    myelinPoints.value = pts;
  } catch(e) {}
};
const getLinkD = (link: NeuronLink) => {
  const s = link.source;
  const t = link.target;
  if (s.x === undefined || t.x === undefined) return "";
  const mx = (s.x + t.x) / 2 + (Math.sin(s.id.length + tickCount.value * 0.05) * 2);
  const my = (s.y + t.y) / 2 + (Math.cos(s.id.length + tickCount.value * 0.05) * 2);
  return `M ${s.x} ${s.y} Q ${mx} ${my} ${t.x} ${t.y}`;
};

const triggerSpike = () => {
  if (isFiring.value) return;
  isFiring.value = true;
  setTimeout(() => isFiring.value = false, 1500);
};

onMounted(() => {
  initData();
  setTimeout(() => startSim(), 100);
});

onUnmounted(() => {
  if (simulation) simulation.stop();
});
</script>

<template>
  <div class="neuron-viewport w-full h-[85vh] bg-[#020617] flex items-center justify-center overflow-hidden font-sans">
    <div class="absolute top-28 right-12 flex gap-4 z-50">
      <button @click="showLabels = !showLabels" class="px-6 py-2 rounded-full border border-white/10 bg-white/5 text-white/30 text-[10px] font-black tracking-widest hover:text-white transition-all uppercase">
        {{ showLabels ? 'Hide Labels' : 'Show Labels' }}
      </button>
      <button @click="triggerSpike" class="px-10 py-2 rounded-full bg-indigo-600 text-white text-[10px] font-black tracking-widest active:scale-95 transition-all uppercase shadow-lg shadow-indigo-500/20">
        Pulse
      </button>
    </div>

    <div class="w-[1150px] h-[650px] relative">
      <svg ref="svgRef" viewBox="0 0 1150 650" class="w-full h-full drop-shadow-2xl !pointer-events-auto">
        <defs>
          <linearGradient id="myelinGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#FDE68A" /><stop offset="100%" stop-color="#F59E0B" />
          </linearGradient>
          <filter id="spikeGlow"><feGaussianBlur stdDeviation="4" /><feComposite in="SourceGraphic" operator="over" /></filter>
        </defs>

        <!-- 1. 全動態物理連結網 -->
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

        <!-- 2. 軸突主幹 (動態) -->
        <path ref="axonPathRef" :d="axonD" stroke="#7C3AED" stroke-width="8" fill="none" stroke-linecap="round" />

        <!-- 3. 髓鞘系統 (跟隨軸突) -->
        <g v-for="(p, i) in myelinPoints" :key="i" :transform="`translate(${p.x}, ${p.y}) rotate(${p.angle})`">
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
          <circle :cx="p.width * 0.1" cy="0" r="3.5" fill="#78350F" opacity="0.7" />
        </g>

        <!-- 4. 細胞本體 (可拖拽區域) -->
        <g v-if="somaNode" class="draggable cursor-move">
          <circle :cx="somaNode.x" :cy="somaNode.y" r="55" fill="#8B5CF6" stroke="#6D28D9" stroke-width="4" />
          <circle :cx="somaNode.x" :cy="somaNode.y + 5" r="32" fill="#311B92" />
          <circle :cx="somaNode.x" :cy="somaNode.y + 5" r="18" fill="#4527A0" />
          <circle :cx="somaNode.x - 8" :cy="somaNode.y - 2" r="8" fill="#FFF" opacity="0.1" />
        </g>

        <!-- 5. 軸突末端根部 (可拖拽區域) -->
        <circle 
          v-if="terminalRootNode" 
          class="draggable cursor-move"
          :cx="terminalRootNode.x" 
          :cy="terminalRootNode.y" 
          r="40" 
          fill="transparent" 
        />

        <!-- 6. 右側末梢小球 (動態) -->
        <g fill="#6D28D9">
          <circle 
            v-for="id in terminalLeafIds" 
            :key="id" 
            :cx="nodes.find(n => n.id === id)?.x" 
            :cy="nodes.find(n => n.id === id)?.y" 
            r="6" 
          />
        </g>

        <!-- 7. 脈衝動畫 (跟隨動態路徑) -->
        <circle v-if="isFiring" r="12" fill="#FFF" filter="url(#spikeGlow)">
          <animateMotion dur="1.2s" repeatCount="1" :path="axonD" />
        </circle>

        <!-- 8. 標籤 -->
        <g v-if="showLabels" class="labels text-[10px] font-black tracking-widest fill-white/10 uppercase italic">
          <text :x="(somaNode?.x || 0) - 200" :y="(somaNode?.y || 0) - 250">Dynamic_Network</text>
          <text :x="(terminalRootNode?.x || 0) - 50" :y="(terminalRootNode?.y || 0) + 220">Terminal_Boutons</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<style scoped>
.draggable { cursor: move; pointer-events: auto; }
svg { pointer-events: none; }
svg * { pointer-events: none; }
svg .draggable { pointer-events: auto; }
</style>
