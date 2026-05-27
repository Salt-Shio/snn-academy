<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue';
import { LIFNeuron, LIFParams } from '../lib/snn/LIFNeuron';

// 模擬參數
const SIM_DURATION = 400; // ms
const DT = 0.1;           // ms
const STEPS = SIM_DURATION / DT;

// 神經元實例與參數 (使用 reactive 方便與 UI 綁定)
const neuronParams = reactive<LIFParams>({
  V_th: -55,
  V_reset: -75,
  V_L: -75,
  tau_m: 10,
  g_L: 10,
  tref: 2,
});

// 輸入電流控制
const injectedCurrent = ref(250); // pA

// 模擬數據歷史
const voltageHistory = ref<number[]>([]);
const spikeTimes = ref<number[]>([]);

const runSimulation = () => {
  const neuron = new LIFNeuron({ ...neuronParams });
  const vHistory: number[] = [];
  const sTimes: number[] = [];

  for (let i = 0; i < STEPS; i++) {
    const time = i * DT;
    
    // 模擬在 100ms 到 300ms 之間注入電流
    const current = (time >= 100 && time <= 300) ? injectedCurrent.value : 0;
    
    const spiked = neuron.step(DT, current);
    
    vHistory.push(neuron.v);
    if (spiked) {
      sTimes.push(time);
    }
  }

  voltageHistory.value = vHistory;
  spikeTimes.value = sTimes;
};

// SVG 繪圖輔助
const getPath = (data: number[]) => {
  if (data.length === 0) return "";
  const width = 800;
  const height = 200;
  const stepX = width / data.length;
  // 映射電壓：-85mV -> 底部(200), 5mV -> 頂部(0)
  const scaleV = (v: number) => {
    return height - ((v + 85) / 90) * height;
  };
  return data.map((v, i) => `${(i * stepX).toFixed(2)},${scaleV(v).toFixed(2)}`).join(" L ");
};

// 參數改變時自動重新模擬
watch([neuronParams, injectedCurrent], () => {
  runSimulation();
}, { deep: true });

onMounted(() => {
  runSimulation();
});
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-8">
    <div class="text-center">
      <h1 class="text-3xl font-black text-white bg-blue-600 inline-block px-4 py-1 rounded-sm">
        SNN 視覺化：基礎 LIF 模型
      </h1>
      <p class="text-gray-400 mt-2">Leaky Integrate-and-Fire Neuron Simulation</p>
    </div>

    <!-- 控制面板 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-800 p-6 rounded-lg border border-gray-700 shadow-xl">
      <div class="space-y-4">
        <h2 class="text-lg font-bold text-blue-400">神經元參數 (Neuron Params)</h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 font-bold uppercase">Threshold (V_th)</label>
            <input type="range" v-model.number="neuronParams.V_th" min="-70" max="-40" step="1" class="w-full" />
            <span class="text-right text-sm font-mono text-white">{{ neuronParams.V_th }} mV</span>
          </div>
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 font-bold uppercase">Time Constant (tau_m)</label>
            <input type="range" v-model.number="neuronParams.tau_m" min="1" max="50" step="1" class="w-full" />
            <span class="text-right text-sm font-mono text-white">{{ neuronParams.tau_m }} ms</span>
          </div>
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 font-bold uppercase">Reset Potential</label>
            <input type="range" v-model.number="neuronParams.V_reset" min="-85" max="-65" step="1" class="w-full" />
            <span class="text-right text-sm font-mono text-white">{{ neuronParams.V_reset }} mV</span>
          </div>
          <div class="flex flex-col">
            <label class="text-xs text-gray-500 font-bold uppercase">Refractory (tref)</label>
            <input type="range" v-model.number="neuronParams.tref" min="0" max="10" step="0.5" class="w-full" />
            <span class="text-right text-sm font-mono text-white">{{ neuronParams.tref }} ms</span>
          </div>
        </div>
      </div>

      <div class="space-y-4 border-l border-gray-700 pl-6">
        <h2 class="text-lg font-bold text-yellow-400">注入電流 (Injected Current)</h2>
        <div class="flex flex-col">
          <label class="text-xs text-gray-500 font-bold uppercase">I_inj (100ms ~ 300ms)</label>
          <input type="range" v-model.number="injectedCurrent" min="0" max="600" step="10" class="w-full" />
          <span class="text-right text-3xl font-black text-white">{{ injectedCurrent }} <span class="text-sm font-normal text-gray-400">pA</span></span>
        </div>
        <div class="pt-4">
          <div class="bg-gray-900 p-3 rounded border border-gray-700 text-xs font-mono text-gray-400 leading-relaxed">
            Formula:<br/>
            τ_m * dv/dt = -(v - V_L) + I_inj/g_L
          </div>
        </div>
      </div>
    </div>

    <!-- 視覺化圖表 -->
    <div class="bg-black p-6 rounded-lg border border-gray-700 shadow-2xl relative">
      <div class="absolute top-4 right-6 flex gap-4">
        <div class="text-xs flex items-center gap-1.5"><div class="w-3 h-3 bg-blue-500 rounded-full"></div> Potential</div>
        <div class="text-xs flex items-center gap-1.5"><div class="w-3 h-3 bg-red-500 rounded-full"></div> Spike</div>
      </div>
      
      <h2 class="text-xl font-bold mb-6 text-gray-300">膜電壓跡線 (Membrane Potential Trace)</h2>
      
      <div class="bg-gray-900 rounded-md overflow-hidden border border-gray-800 h-64 relative">
        <svg viewBox="0 0 800 200" preserveAspectRatio="none" class="w-full h-full">
          <!-- 網格線 -->
          <line x1="0" y1="50" x2="800" y2="50" stroke="#2d3748" stroke-width="0.5" />
          <line x1="0" y1="100" x2="800" y2="100" stroke="#2d3748" stroke-width="0.5" />
          <line x1="0" y1="150" x2="800" y2="150" stroke="#2d3748" stroke-width="0.5" />

          <!-- 閾值線 (紅) -->
          <line 
            x1="0" 
            :y1="200 - ((neuronParams.V_th + 85) / 90) * 200" 
            x2="800" 
            :y2="200 - ((neuronParams.V_th + 85) / 90) * 200" 
            stroke="#f56565" 
            stroke-dasharray="4,4" 
            stroke-width="1.5"
          />

          <!-- 電位路徑 -->
          <path :d="'M ' + getPath(voltageHistory)" fill="none" stroke="#4299e1" stroke-width="2.5" />

          <!-- Spike 標記 -->
          <g v-for="t in spikeTimes" :key="t">
            <line 
              :x1="(t / SIM_DURATION) * 800" 
              y1="0" 
              :x2="(t / SIM_DURATION) * 800" 
              y2="200" 
              stroke="#f56565" 
              stroke-width="1" 
              opacity="0.3" 
            />
            <circle 
              :cx="(t / SIM_DURATION) * 800" 
              :cy="200 - ((neuronParams.V_th + 85) / 90) * 200" 
              r="4" 
              fill="#f56565" 
            />
          </g>
        </svg>

        <!-- 電壓標籤 -->
        <div class="absolute left-2 top-0 h-full flex flex-col justify-between text-[10px] font-mono text-gray-600 pointer-events-none">
          <span>5mV</span>
          <span>-40mV</span>
          <span>-85mV</span>
        </div>
      </div>

      <div class="flex justify-between mt-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
        <span>0 ms</span>
        <span>Simulation Timeline ({{ SIM_DURATION }} ms)</span>
        <span>{{ SIM_DURATION }} ms</span>
      </div>
    </div>

    <!-- 狀態卡片 -->
    <div class="bg-gray-800 p-4 rounded border border-gray-700 flex justify-around">
      <div class="text-center">
        <div class="text-xs text-gray-500 uppercase font-bold">Spike Count</div>
        <div class="text-2xl font-mono text-white">{{ spikeTimes.length }}</div>
      </div>
      <div class="text-center">
        <div class="text-xs text-gray-500 uppercase font-bold">Firing Rate</div>
        <div class="text-2xl font-mono text-white">{{ ((spikeTimes.length / SIM_DURATION) * 1000).toFixed(1) }} <span class="text-xs text-gray-400">Hz</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type=range] {
  accent-color: #3182ce;
}
</style>
