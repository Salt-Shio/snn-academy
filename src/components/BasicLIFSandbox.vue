<script setup lang="ts">
import { ref, onMounted, reactive, watch, nextTick } from 'vue';
// 導入統一的 LIFNeuron
import { LIFNeuron } from '../lib/snn/neurons/LIFNeuron';
import { PoissonSource } from '../lib/snn/PoissonSource';
import { GWNSource } from '../lib/snn/GWNSource';
import { calculateCV_ISI, generateFICurve } from '../lib/snn/metrics';
import { StaticSynapse } from '../lib/snn/synapses/StaticSynapse';
import { STPSynapse } from '../lib/snn/synapses/STPSynapse';
import { CobaSynapse } from '../lib/snn/synapses/CobaSynapse';
import type { ISynapse } from '../lib/snn/synapses/ISynapse';

// KaTeX 樣式 (僅前端 UI 依賴)
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render';

const analysisPanel = ref<HTMLElement | null>(null);

const renderMath = () => {
  if (analysisPanel.value) {
    renderMathInElement(analysisPanel.value, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false
    });
  }
};

// --- 模型選擇 ---
type ModelType = 'cuba' | 'coba';
const modelType = ref<ModelType>('cuba');

// --- 模擬參數 ---
const SIM_DURATION = 400; // ms
const DT = 0.1;           // ms
const STEPS = SIM_DURATION / DT;

// --- 輸入模式 ---
type InputMode = 'constant' | 'poisson';
const inputMode = ref<InputMode>('constant');

// --- 突觸模式 ---
type SynapseType = 'static' | 'stp';
const synapseType = ref<SynapseType>('static');

// --- 共享參數 (Shared) ---
const constantInjection = ref(250);      // pA (外部注入電流)
const poissonPulseStrength = ref(15);    // 共享數值 (CUBA: pA, COBA: nS)
const poissonRate = ref(50);             // Hz
const noiseSigma = ref(0);               // 雜訊強度 (mV)

// --- 突觸共通參數 ---
const synapseParams = reactive({
  tau_syn: 5.0, // ms
});

// --- STP 專屬參數 ---
const stpParams = reactive({
  U0: 0.5,
  tau_d: 100,
  tau_f: 50,
});

// --- CUBA 專屬參數 ---
const cubaParams = reactive({
  V_th: -55,
  V_reset: -75,
  V_L: -75,
  g_L: 10,  // nS
  C_m: 100, // pF (由 tau_m=10ms 推導: Cm = tau_m * gL)
  tref: 2,
});

// --- COBA 專屬參數 ---
const cobaParams = reactive({
  V_th: -55,
  V_reset: -75,
  V_L: -75,
  g_L: 10,   // nS
  C_m: 200,  // pF
  V_E: 0,    // 興奮性反轉電位 (mV)
  V_I: -80,  // 抑制性反轉電位 (mV)
  tref: 2,
});

// --- 數據歷史 ---
const voltageHistory = ref<number[]>([]);
const currentHistory = ref<number[]>([]);
const neuronSpikeTimes = ref<number[]>([]);
const poissonSpikeTimes = ref<number[]>([]);

// --- 分析相關數據 ---
const cvISI = ref(0);
const fiCurveData = ref<{ current: number; freq: number }[]>([]);
const isCalculatingFI = ref(false);

const runSimulation = () => {
  // 根據選擇的模型類型初始化
  const params = modelType.value === 'cuba' ? cubaParams : cobaParams;
  const neuron = new LIFNeuron({ ...params } as any);

  // 根據選擇的突觸類型初始化基礎突觸
  let baseSynapse: ISynapse;
  if (synapseType.value === 'static') {
    baseSynapse = new StaticSynapse(poissonPulseStrength.value, synapseParams.tau_syn);
  } else {
    baseSynapse = new STPSynapse(
      poissonPulseStrength.value, 
      synapseParams.tau_syn, 
      stpParams.U0, 
      stpParams.tau_d, 
      stpParams.tau_f
    );
  }

  // 若為 COBA 模式，則套用裝飾器進行電導轉電流的計算
  const synapse = modelType.value === 'coba' 
    ? new CobaSynapse(baseSynapse, cobaParams.V_E)
    : baseSynapse;

  const pSource = new PoissonSource(poissonRate.value);
  
  const vHistory: number[] = [];
  const iHistory: number[] = [];
  const nSpikes: number[] = [];
  const pSpikes: number[] = [];

  for (let i = 0; i < STEPS; i++) {
    const time = i * DT;
    let syn_in = 0;
    
    // 1. 檢查脈衝源 (僅在泊松模式)
    const hasPreSpike = (inputMode.value === 'poisson') && pSource.step(DT);
    if (hasPreSpike) pSpikes.push(time);

    // 2. 突觸處理 (獲取連續的等效注入電流 pA)
    // 傳入 postVoltage 讓 COBA 模式可以計算驅動力
    syn_in = synapse.step(DT, hasPreSpike, neuron.v);

    // 3. 計算外部注入電流 (ext_current): Constant Injection + GWN
    const iBase = (time >= 100 && time <= 300) ? constantInjection.value : 0;
    const g_L_val = modelType.value === 'cuba' ? cubaParams.g_L : cobaParams.g_L;
    const c_m_val = modelType.value === 'cuba' ? cubaParams.C_m : cobaParams.C_m;
    const tau_m = c_m_val / (typeof g_L_val === 'number' ? g_L_val : 10);
    
    const iNoise = GWNSource.getNoiseCurrent(noiseSigma.value, tau_m, typeof g_L_val === 'number' ? g_L_val : 10, DT);
    const ext_i = iBase + iNoise;

    // 4. 推進神經元
    const spiked = neuron.step(DT, time, syn_in, ext_i);
    vHistory.push(neuron.v);
    
    // 視覺化電流 (Effective Total Current, 單位 pA)
    // CUBA 與 COBA 的 syn_in 現在皆已是由突觸層計算好的電流
    let visualCurrent = ext_i + syn_in;
    iHistory.push(visualCurrent);

    if (spiked) nSpikes.push(time);
  }

  voltageHistory.value = vHistory;
  currentHistory.value = iHistory;
  neuronSpikeTimes.value = nSpikes;
  poissonSpikeTimes.value = pSpikes;
  cvISI.value = calculateCV_ISI(nSpikes);
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

const getCurrentPath = (data: number[]) => {
  if (data.length === 0) return "";
  const width = 800;
  const height = 60;
  const stepX = width / data.length;
  const maxI = data.reduce((max, val) => Math.max(max, val), 1000);
  const scaleI = (i: number) => height - (i / maxI) * height;
  return data.map((iVal, idx) => `${(idx * stepX).toFixed(2)},${scaleI(iVal).toFixed(2)}`).join(" L ");
};

const getFIPath = (data: { current: number; freq: number }[]) => {
  if (data.length === 0) return "";
  const width = 300;
  const height = 120;
  const maxI = modelType.value === 'cuba' ? 800 : 50; // COBA 強度範圍不同
  const maxF = data.reduce((max, d) => Math.max(max, d.freq), 100);
  
  return data.map(d => {
    const x = (d.current / maxI) * width;
    const y = height - (d.freq / maxF) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" L ");
};

// 監聽變動
watch([modelType, inputMode, constantInjection, poissonPulseStrength, poissonRate, noiseSigma, synapseType, synapseParams, stpParams, cubaParams, cobaParams], () => {
  runSimulation();
}, { deep: true });

let fiTimeout: number | null = null;
watch([modelType, cubaParams, cobaParams], () => {
  if (fiTimeout) clearTimeout(fiTimeout);
  isCalculatingFI.value = true;
  fiTimeout = window.setTimeout(() => {
    const params = modelType.value === 'cuba' ? cubaParams : cobaParams;
    const iMax = modelType.value === 'cuba' ? 800 : 50;
    fiCurveData.value = generateFICurve(LIFNeuron, params as any, iMax);
    isCalculatingFI.value = false;
    nextTick(() => renderMath());
  }, 300);
}, { deep: true, immediate: true });

onMounted(() => {
  runSimulation();
  renderMath();
});
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">
    <!-- 頂部模型切換 -->
    <div class="flex flex-col items-center gap-4">
      <h1 class="text-3xl font-black text-white bg-indigo-600 inline-block px-4 py-1 rounded-sm">
        SNN 多模型沙盒：CUBA vs COBA
      </h1>
      <div class="flex p-1 bg-gray-800 rounded-xl gap-1 w-full max-w-md shadow-2xl">
        <button @click="modelType = 'cuba'" 
          :class="['flex-1 py-3 rounded-lg font-black transition-all text-sm tracking-widest', modelType === 'cuba' ? 'bg-indigo-600 text-white shadow-lg ring-2 ring-indigo-400' : 'text-gray-500 hover:bg-gray-700']">
          基礎模式 (CUBA)
        </button>
        <button @click="modelType = 'coba'" 
          :class="['flex-1 py-3 rounded-lg font-black transition-all text-sm tracking-widest', modelType === 'coba' ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400' : 'text-gray-500 hover:bg-gray-700']">
          進階模式 (COBA)
        </button>
      </div>
    </div>

    <!-- 控制面板組 -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 共享輸入設定 -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-yellow-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">輸入訊號源 (Input Signal)</h2>
        </div>

        <div class="flex p-1 bg-gray-900 rounded-lg gap-1">
          <button @click="inputMode = 'constant'" :class="['flex-1 py-2 rounded-md font-bold transition text-sm', inputMode === 'constant' ? 'bg-gray-600 text-white' : 'text-gray-500']">
            常數注入
          </button>
          <button @click="inputMode = 'poisson'" :class="['flex-1 py-2 rounded-md font-bold transition text-sm', inputMode === 'poisson' ? 'bg-orange-600 text-white' : 'text-gray-500']">
            泊松脈衝
          </button>
        </div>

        <div class="space-y-4">
          <div class="flex flex-col">
            <div class="flex justify-between items-end mb-2">
              <label class="text-xs text-gray-400 font-bold uppercase">Base Injection (Iinj)</label>
              <span class="text-2xl font-mono text-yellow-400">{{ constantInjection }} <span class="text-xs">pA</span></span>
            </div>
            <input type="range" v-model.number="constantInjection" min="0" max="600" step="10" class="w-full accent-yellow-500" />
          </div>

          <div v-if="inputMode === 'poisson'" class="space-y-4 pt-4 border-t border-gray-700">
            <div class="flex flex-col">
              <div class="flex justify-between items-end mb-2">
                <label class="text-xs text-gray-400 font-bold uppercase">{{ modelType === 'cuba' ? 'Pulse Current' : 'Pulse Conductance' }}</label>
                <span class="text-2xl font-mono text-orange-400">{{ poissonPulseStrength }} <span class="text-xs">{{ modelType === 'cuba' ? 'pA' : 'nS' }}</span></span>
              </div>
              <input type="range" v-model.number="poissonPulseStrength" :min="modelType === 'cuba' ? 500 : 1" :max="modelType === 'cuba' ? 5000 : 100" step="1" class="w-full accent-orange-500" />
            </div>
            <div class="flex flex-col">
              <div class="flex justify-between items-end mb-2">
                <label class="text-xs text-gray-400 font-bold uppercase">Rate (Hz)</label>
                <span class="text-2xl font-mono text-orange-300">{{ poissonRate }}</span>
              </div>
              <input type="range" v-model.number="poissonRate" min="1" max="200" step="1" class="w-full accent-orange-300" />
            </div>
          </div>

          <div class="flex flex-col pt-4 border-t border-gray-700">
            <div class="flex justify-between items-end mb-2">
              <label class="text-xs text-gray-400 font-bold uppercase">Background Noise (σ)</label>
              <span class="text-2xl font-mono text-pink-500">{{ noiseSigma }} <span class="text-xs">mV</span></span>
            </div>
            <input type="range" v-model.number="noiseSigma" min="0" max="10" step="0.5" class="w-full accent-pink-500" />
          </div>
        </div>
      </div>

      <!-- 突觸動力學設定 (New Synapse Dynamics) -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-orange-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">突觸動力學 (Synapse Dynamics)</h2>
        </div>

        <!-- 突觸模型切換 -->
        <div class="flex p-1 bg-gray-900 rounded-lg gap-1">
          <button @click="synapseType = 'static'" :class="['flex-1 py-2 rounded-md font-bold transition text-sm', synapseType === 'static' ? 'bg-orange-600 text-white' : 'text-gray-500']">
            靜態 (Static)
          </button>
          <button @click="synapseType = 'stp'" :class="['flex-1 py-2 rounded-md font-bold transition text-sm', synapseType === 'stp' ? 'bg-orange-600 text-white' : 'text-gray-500']">
            短期可塑性 (STP)
          </button>
        </div>

        <div class="space-y-4">
          <!-- 共通：衰減常數 -->
          <div class="flex flex-col">
            <div class="flex justify-between items-end mb-2">
              <label class="text-xs text-gray-400 font-bold uppercase">Decay (τ_syn)</label>
              <span class="text-xl font-mono text-orange-400">{{ synapseParams.tau_syn }} <span class="text-xs">ms</span></span>
            </div>
            <input type="range" v-model.number="synapseParams.tau_syn" min="0" max="20" step="0.5" class="w-full accent-orange-500" />
          </div>

          <!-- STP 專屬參數 -->
          <div v-if="synapseType === 'stp'" class="space-y-4 pt-4 border-t border-gray-700">
            <div class="grid grid-cols-2 gap-4">
               <div class="flex flex-col">
                <label class="text-[10px] text-gray-500 uppercase font-bold mb-1">Release Prob (U0)</label>
                <input type="range" v-model.number="stpParams.U0" min="0.01" max="1.0" step="0.05" class="w-full accent-orange-400" />
                <span class="text-xs text-center text-orange-300 font-mono">{{ stpParams.U0 }}</span>
              </div>
              <div class="flex flex-col">
                <label class="text-[10px] text-gray-500 uppercase font-bold mb-1">Depression (τ_d)</label>
                <input type="range" v-model.number="stpParams.tau_d" min="10" max="500" step="10" class="w-full accent-orange-400" />
                <span class="text-xs text-center text-orange-300 font-mono">{{ stpParams.tau_d }} ms</span>
              </div>
              <div class="flex flex-col">
                <label class="text-[10px] text-gray-500 uppercase font-bold mb-1">Facilitation (τ_f)</label>
                <input type="range" v-model.number="stpParams.tau_f" min="10" max="1000" step="10" class="w-full accent-orange-400" />
                <span class="text-xs text-center text-orange-300 font-mono">{{ stpParams.tau_f }} ms</span>
              </div>
            </div>
          </div>
        </div>
        
        <p class="text-[10px] text-gray-500 leading-tight italic">
            {{ synapseType === 'static' ? '靜態模式：突觸強度固定。' : 'STP 模式：模擬資源耗盡(STD)與鈣累積(STF)效應。' }}
        </p>
      </div>

      <!-- 模型專屬物理特性 -->
      <div :class="['p-6 rounded-xl border shadow-xl transition-all duration-500', modelType === 'cuba' ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-emerald-900/20 border-emerald-500/50']">
        <div class="flex items-center gap-2 mb-6">
          <div :class="['w-2 h-6 rounded-full', modelType === 'cuba' ? 'bg-indigo-500' : 'bg-emerald-500']"></div>
          <h2 class="text-xl font-bold text-white">{{ modelType === 'cuba' ? 'CUBA 物理參數' : 'COBA 物理參數' }}</h2>
        </div>

        <div v-if="modelType === 'cuba'" class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
           <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Threshold (V_th)</span>
              <span class="text-indigo-400">{{ cubaParams.V_th }} mV</span>
            </div>
            <input type="range" v-model.number="cubaParams.V_th" min="-70" max="-40" step="1" class="w-full accent-indigo-500" />
          </div>
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Capacitance (C_m)</span>
              <span class="text-indigo-400">{{ cubaParams.C_m }} pF</span>
            </div>
            <input type="range" v-model.number="cubaParams.C_m" min="50" max="500" step="10" class="w-full accent-indigo-500" />
          </div>
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Leak G (g_L)</span>
              <span class="text-indigo-400">{{ cubaParams.g_L }} nS</span>
            </div>
            <input type="range" v-model.number="cubaParams.g_L" min="1" max="50" step="1" class="w-full accent-indigo-500" />
          </div>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Threshold (V_th)</span>
              <span class="text-emerald-400">{{ cobaParams.V_th }} mV</span>
            </div>
            <input type="range" v-model.number="cobaParams.V_th" min="-70" max="-40" step="1" class="w-full accent-emerald-500" />
          </div>
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Capacitance (C_m)</span>
              <span class="text-emerald-400">{{ cobaParams.C_m }} pF</span>
            </div>
            <input type="range" v-model.number="cobaParams.C_m" min="50" max="500" step="10" class="w-full accent-emerald-500" />
          </div>
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Exc Reversal (V_E)</span>
              <span class="text-emerald-400">{{ cobaParams.V_E }} mV</span>
            </div>
            <input type="range" v-model.number="cobaParams.V_E" min="-20" max="20" step="1" class="w-full accent-emerald-500" />
          </div>
          <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Inh Reversal (V_I)</span>
              <span class="text-emerald-400">{{ cobaParams.V_I }} mV</span>
            </div>
            <input type="range" v-model.number="cobaParams.V_I" min="-100" max="-60" step="1" class="w-full accent-emerald-500" />
          </div>
        </div>

        <div class="mt-8 p-4 bg-black/40 rounded border border-white/10">
            <p class="text-[10px] text-gray-400 leading-relaxed italic">
                {{ modelType === 'cuba' ? 'CUBA: 突觸輸入直接轉為恆定電流。' : 'COBA: 突觸輸入轉為電導，其產生的電流隨電壓 (V - V_rev) 變化。' }}
            </p>
        </div>
      </div>
    </div>

    <!-- 視覺化圖表 -->
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

      <div class="bg-gray-900 p-6 rounded-lg border border-gray-800 shadow-2xl">
        <h3 class="text-xs font-bold text-blue-500 uppercase mb-4 tracking-widest">Membrane Potential (mV)</h3>
        <div class="h-64 relative bg-black rounded overflow-hidden flex">
          <div class="flex flex-col justify-between text-[9px] font-mono text-gray-600 mr-2 py-1">
            <span>+5</span><span>-40</span><span>-85</span>
          </div>
          <div class="flex-1 relative">
            <svg viewBox="0 0 800 200" preserveAspectRatio="none" class="w-full h-full">
              <line x1="0" y1="50" x2="800" y2="50" stroke="#1a202c" stroke-width="0.5" />
              <line x1="0" y1="100" x2="800" y2="100" stroke="#1a202c" stroke-width="0.5" />
              <line x1="0" y1="150" x2="800" y2="150" stroke="#1a202c" stroke-width="0.5" />
              <line x1="0" :y1="200 - (( (modelType === 'cuba' ? cubaParams.V_th : cobaParams.V_th) + 85) / 90) * 200" x2="800" :y2="200 - (( (modelType === 'cuba' ? cubaParams.V_th : cobaParams.V_th) + 85) / 90) * 200" stroke="#f87171" stroke-dasharray="4,2" />
              <path :d="'M ' + getVoltagePath(voltageHistory)" fill="none" stroke="#3b82f6" stroke-width="2" />
              <g v-for="t in neuronSpikeTimes" :key="t">
                <circle :cx="(t / SIM_DURATION) * 800" :cy="200 - (( (modelType === 'cuba' ? cubaParams.V_th : cobaParams.V_th) + 85) / 90) * 200" r="3" fill="#ef4444" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-gray-900 p-4 rounded-lg border border-gray-800 shadow-inner">
        <h3 class="text-xs font-bold text-yellow-500 uppercase mb-2 tracking-widest">Effective Current (pA)</h3>
        <div class="h-16 relative bg-black rounded overflow-hidden flex">
          <div class="flex flex-col justify-between text-[8px] font-mono text-gray-600 mr-2 py-1">
            <span>{{ currentHistory.reduce((max, val) => Math.max(max, val), 1000).toFixed(0) }}</span><span>0</span>
          </div>
          <div class="flex-1 relative">
            <svg viewBox="0 0 800 60" preserveAspectRatio="none" class="w-full h-full">
              <path :d="'M ' + getCurrentPath(currentHistory)" fill="none" stroke="#eab308" stroke-width="1.5" opacity="0.8" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 數據分析與 F-I -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center">
            <div class="text-[10px] text-gray-500 uppercase font-bold">Model</div>
            <div class="text-xl font-mono text-white uppercase">{{ modelType }}</div>
        </div>
        <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center">
            <div class="text-[10px] text-gray-500 uppercase font-bold">Output Rate</div>
            <div class="text-xl font-mono text-blue-400">{{ ((neuronSpikeTimes.length / SIM_DURATION) * 1000).toFixed(1) }} Hz</div>
        </div>
        <div class="bg-gray-800 p-3 rounded border border-gray-700 text-center border-l-2 border-l-pink-500">
            <div class="text-[10px] text-pink-500 uppercase font-bold">CV_ISI</div>
            <div class="text-xl font-mono text-pink-400">{{ cvISI.toFixed(3) }}</div>
        </div>
    </div>

    <div ref="analysisPanel" class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-emerald-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">特性分析 (F-I Curve)</h2>
        </div>
        <div v-if="isCalculatingFI" class="flex items-center gap-2 text-xs text-gray-500 italic">
          <div class="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          計算中...
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="md:col-span-2 bg-black p-4 rounded-lg border border-gray-900 relative flex">
          <div class="flex flex-col justify-between text-[8px] font-mono text-gray-600 mr-2 py-4">
            <span>{{ fiCurveData.reduce((max, d) => Math.max(max, d.freq), 100).toFixed(0) }}</span><span>0</span>
          </div>
          <div class="flex-1">
            <h3 class="text-[10px] font-bold text-gray-500 uppercase mb-4 tracking-widest text-center">Frequency (Hz) vs Intensity</h3>
            <div class="h-40 relative px-2">
              <svg viewBox="0 0 300 120" preserveAspectRatio="none" class="w-full h-full">
                <path :d="'M ' + getFIPath(fiCurveData)" fill="none" stroke="#10b981" stroke-width="2.5" />
              </svg>
              <div class="flex justify-between mt-2 text-[8px] font-mono text-gray-600 uppercase">
                <span>0</span><span>{{ modelType === 'cuba' ? '400' : '25' }}</span><span>{{ modelType === 'cuba' ? '800' : '50' }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="flex flex-col justify-center space-y-4">
            <div class="bg-gray-900 p-4 rounded border border-gray-800">
                <h4 class="text-[10px] font-bold text-emerald-500 uppercase mb-1">模式差異說明</h4>
                <p class="text-[11px] text-gray-400 leading-relaxed">
                    在 **COBA** 下，突觸強度是電導。隨著 $V$ 接近 $V_E$，驅動力會逐漸飽和，這是與 **CUBA** 最大的物理差異。
                </p>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
path { transition: d 0.1s ease-out; }
</style>
