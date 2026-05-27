<script setup lang="ts">
import { ref, onMounted, reactive, watch } from 'vue';
import { LIFNeuron, LIFParams } from '../lib/snn/LIFNeuron';
import { PoissonSource } from '../lib/snn/PoissonSource';

// 模擬參數
const SIM_DURATION = 400; // ms
const DT = 0.1;           // ms
const STEPS = SIM_DURATION / DT;

// 輸入模式
type InputMode = 'constant' | 'poisson';
const inputMode = ref<InputMode>('constant');

// 基礎參數
const neuronParams = reactive<LIFParams>({
  V_th: -55,
  V_reset: -75,
  V_L: -75,
  tau_m: 10,
  g_L: 10,
  tref: 2,
});

const constantCurrent = ref(250); // pA
const poissonRate = ref(50);      // Hz
const poissonPulseAmplitude = ref(2000); // 脈衝強度 (pA)，用於模擬輸入

// 模擬數據歷史
const voltageHistory = ref<number[]>([]);
const neuronSpikeTimes = ref<number[]>([]);
const poissonSpikeTimes = ref<number[]>([]);

const runSimulation = () => {
  const neuron = new LIFNeuron({ ...neuronParams });
  const pSource = new PoissonSource(poissonRate.value);
  
  const vHistory: number[] = [];
  const nSpikes: number[] = [];
  const pSpikes: number[] = [];

  for (let i = 0; i < STEPS; i++) {
    const time = i * DT;
    let current = 0;

    if (inputMode.value === 'constant') {
      // 常數模式 (100-300ms)
      current = (time >= 100 && time <= 300) ? constantCurrent.value : 0;
    } else {
      // 泊松模式
      if (pSource.step(DT)) {
        pSpikes.push(time);
        current = poissonPulseAmplitude.value; // 當泊松源發生脈衝，注入一個瞬時強電流
      }
    }
    
    const spiked = neuron.step(DT, current);
    vHistory.push(neuron.v);
    if (spiked) nSpikes.push(time);
  }

  voltageHistory.value = vHistory;
  neuronSpikeTimes.value = nSpikes;
  poissonSpikeTimes.value = pSpikes;
};

// SVG 繪圖輔助
const getVoltagePath = (data: number[]) => {
  if (data.length === 0) return "";
  const width = 800;
  const height = 200;
  const stepX = width / data.length;
  const scaleV = (v: number) => height - ((v + 85) / 90) * height;
  return data.map((v, i) => `${(i * stepX).toFixed(2)},${scaleV(v).toFixed(2)}`).join(" L ");
};

// 參數改變時自動重新模擬
watch([neuronParams, constantCurrent, poissonRate, inputMode, poissonPulseAmplitude], () => {
  runSimulation();
}, { deep: true });

onMounted(() => {
  runSimulation();
});
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <div class="text-center">
      <h1 class="text-3xl font-black text-white bg-indigo-600 inline-block px-4 py-1 rounded-sm">
        SNN 視覺化：輸入隨機性 (Poisson Source)
      </h1>
      <p class="text-gray-400 mt-2">比較常數輸入與隨機脈衝輸入對 LIF 神經元的影響</p>
    </div>

    <!-- 控制面板組 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 第一部分：輸入訊號調整界面 (Input Configuration) -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-indigo-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">輸入訊號設定 (Input)</h2>
        </div>

        <!-- 模式切換 -->
        <div class="flex p-1 bg-gray-900 rounded-lg gap-1">
          <button 
            @click="inputMode = 'constant'"
            :class="['flex-1 py-2 rounded-md font-bold transition text-sm', inputMode === 'constant' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800']"
          >
            常數電流
          </button>
          <button 
            @click="inputMode = 'poisson'"
            :class="['flex-1 py-2 rounded-md font-bold transition text-sm', inputMode === 'poisson' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:bg-gray-800']"
          >
            泊松脈衝
          </button>
        </div>

        <!-- 模式參數 -->
        <div class="space-y-4">
          <div v-if="inputMode === 'constant'" class="space-y-4">
            <div class="flex flex-col">
              <div class="flex justify-between items-end mb-2">
                <label class="text-xs text-gray-400 font-bold uppercase tracking-widest">Injected Current</label>
                <span class="text-2xl font-mono text-yellow-400 leading-none">{{ constantCurrent }} <span class="text-xs text-gray-500">pA</span></span>
              </div>
              <input type="range" v-model.number="constantCurrent" min="0" max="600" step="10" class="w-full accent-yellow-500" />
            </div>
            <p class="text-[10px] text-gray-500 italic">在 100ms 至 300ms 區間注入常數電流。</p>
          </div>

          <div v-else class="space-y-6">
            <div class="flex flex-col">
              <div class="flex justify-between items-end mb-2">
                <label class="text-xs text-gray-400 font-bold uppercase tracking-widest">Firing Rate</label>
                <span class="text-2xl font-mono text-orange-400 leading-none">{{ poissonRate }} <span class="text-xs text-gray-500">Hz</span></span>
              </div>
              <input type="range" v-model.number="poissonRate" min="1" max="200" step="1" class="w-full accent-orange-500" />
            </div>
            <div class="flex flex-col">
              <div class="flex justify-between items-end mb-2">
                <label class="text-xs text-gray-400 font-bold uppercase tracking-widest">Pulse Strength</label>
                <span class="text-2xl font-mono text-orange-300 leading-none">{{ poissonPulseAmplitude }} <span class="text-xs text-gray-500">pA</span></span>
              </div>
              <input type="range" v-model.number="poissonPulseAmplitude" min="500" max="5000" step="100" class="w-full accent-orange-300" />
            </div>
          </div>
        </div>
      </div>

      <!-- 第二部分：神經元特性調整界面 (Neuron Properties) -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-blue-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">神經元物理特性 (Properties)</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <!-- Threshold -->
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Threshold (V_th)</span>
              <span class="text-blue-400">{{ neuronParams.V_th }} mV</span>
            </div>
            <input type="range" v-model.number="neuronParams.V_th" min="-70" max="-40" step="1" class="w-full accent-blue-500" />
          </div>

          <!-- tau_m -->
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Time Constant (τ_m)</span>
              <span class="text-blue-400">{{ neuronParams.tau_m }} ms</span>
            </div>
            <input type="range" v-model.number="neuronParams.tau_m" min="1" max="50" step="1" class="w-full accent-blue-500" />
          </div>

          <!-- Reset -->
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Reset Potential</span>
              <span class="text-blue-400">{{ neuronParams.V_reset }} mV</span>
            </div>
            <input type="range" v-model.number="neuronParams.V_reset" min="-85" max="-65" step="1" class="w-full accent-blue-500" />
          </div>

          <!-- Refractory -->
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Refractory (tref)</span>
              <span class="text-blue-400">{{ neuronParams.tref }} ms</span>
            </div>
            <input type="range" v-model.number="neuronParams.tref" min="0" max="10" step="0.5" class="w-full accent-blue-500" />
          </div>
        </div>

        <div class="pt-2 border-t border-gray-700">
          <div class="text-[10px] text-gray-500 leading-tight font-mono">
            Leak reversal V_L = {{ neuronParams.V_L }} mV<br/>
            Leak conductance g_L = {{ neuronParams.g_L }} nS
          </div>
        </div>
      </div>
    </div>

    <!-- 視覺化圖表組 -->
    <div class="space-y-4">
      <!-- 1. Poisson Spike Train (Raster Plot) -->
      <div v-if="inputMode === 'poisson'" class="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-inner">
        <h3 class="text-xs font-bold text-orange-500 uppercase mb-2 tracking-widest">Input Spike Train (Poisson Source)</h3>
        <div class="h-12 relative bg-black rounded border border-gray-900">
          <svg viewBox="0 0 800 50" preserveAspectRatio="none" class="w-full h-full">
            <line v-for="t in poissonSpikeTimes" :key="t" 
              :x1="(t / SIM_DURATION) * 800" y1="5" 
              :x2="(t / SIM_DURATION) * 800" y2="45" 
              stroke="#fb923c" stroke-width="1.5" 
            />
          </svg>
        </div>
      </div>

      <!-- 2. Membrane Potential -->
      <div class="bg-gray-900 p-6 rounded-lg border border-gray-800 shadow-2xl relative">
        <div class="absolute top-4 right-6 flex gap-4">
          <div class="text-[10px] flex items-center gap-1.5"><div class="w-2 h-2 bg-blue-500 rounded-full"></div> Potential</div>
          <div class="text-[10px] flex items-center gap-1.5"><div class="w-2 h-2 bg-red-500 rounded-full"></div> Spike</div>
        </div>
        <h3 class="text-xs font-bold text-blue-500 uppercase mb-4 tracking-widest">LIF Membrane Potential</h3>
        
        <div class="h-64 relative bg-black rounded border border-gray-900 overflow-hidden">
          <svg viewBox="0 0 800 200" preserveAspectRatio="none" class="w-full h-full">
            <!-- Grid -->
            <line x1="0" y1="50" x2="800" y2="50" stroke="#1a202c" stroke-width="0.5" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#1a202c" stroke-width="0.5" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#1a202c" stroke-width="0.5" />

            <!-- Threshold -->
            <line 
              x1="0" :y1="200 - ((neuronParams.V_th + 85) / 90) * 200" 
              x2="800" :y2="200 - ((neuronParams.V_th + 85) / 90) * 200" 
              stroke="#f87171" stroke-dasharray="4,2" stroke-width="1"
            />

            <!-- Trace -->
            <path :d="'M ' + getVoltagePath(voltageHistory)" fill="none" stroke="#3b82f6" stroke-width="2" />

            <!-- Neuron Spikes -->
            <g v-for="t in neuronSpikeTimes" :key="t">
              <circle :cx="(t / SIM_DURATION) * 800" :cy="200 - ((neuronParams.V_th + 85) / 90) * 200" r="3" fill="#ef4444" />
            </g>
          </svg>
        </div>
        
        <div class="flex justify-between mt-2 text-[9px] font-mono text-gray-600 uppercase">
          <span>0 ms</span>
          <span>400 ms Simulation</span>
          <span>400 ms</span>
        </div>
      </div>
    </div>

    <!-- 數據概覽 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-bold">Input Spikes</div>
        <div class="text-xl font-mono text-orange-400">{{ poissonSpikeTimes.length }}</div>
      </div>
      <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-bold">Output Spikes</div>
        <div class="text-xl font-mono text-red-400">{{ neuronSpikeTimes.length }}</div>
      </div>
      <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-bold">Gain (Output/Input)</div>
        <div class="text-xl font-mono text-white">{{ poissonSpikeTimes.length ? (neuronSpikeTimes.length / poissonSpikeTimes.length).toFixed(2) : '0.00' }}</div>
      </div>
      <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center">
        <div class="text-[10px] text-gray-500 uppercase font-bold">Output Rate</div>
        <div class="text-xl font-mono text-blue-400">{{ ((neuronSpikeTimes.length / SIM_DURATION) * 1000).toFixed(1) }} Hz</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 一些簡單的過度動畫 */
path {
  transition: d 0.1s ease-out;
}
</style>
