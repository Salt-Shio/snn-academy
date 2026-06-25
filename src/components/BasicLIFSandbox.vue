<script setup lang="ts">
import { ref, onMounted, reactive, watch, nextTick } from 'vue';
import { GWNSource } from '../lib/snn/sources';
import { getVoltagePath, getCurrentPath, getWeightPath, getFIPath } from '../lib/snn/visual/utils/chartUtils';
import { calculateCV_ISI, generateFICurve } from '../lib/snn/metrics';

// 導入網路層 (核心與監聽器)
import { SNNNetwork, Connection, SpikeGeneratorNode, createNeuron, createSynapseChain, StateMonitor, SynapseMonitor } from '../lib/snn/network';

// 以下僅供 F-I 曲線計算使用 (generateFICurve 需要具體的 Class 與 Factory)
import { LIFNeuron, ALIFNeuron } from '../lib/snn/neurons';
import { CubaSynapse, CobaSynapse } from '../lib/snn/synapses';
import type { ISynapseDynamics } from '../lib/snn/synapses';

// KaTeX 樣式 (僅前端 UI 依賴)
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render';

const analysisPanel = ref<HTMLElement | null>(null);

const renderMath = () => {
  if (analysisPanel.value) {
    renderMathInElement(analysisPanel.value, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false }
      ]
    });
  }
};

// --- 模型與輸入切換 ---
type ModelType = 'cuba' | 'coba';
const modelType = ref<ModelType>('cuba');

const SIM_DURATION = 400; // ms
const DT = 0.1;           // ms
const STEPS = SIM_DURATION / DT;

type InputMode = 'constant' | 'poisson';
const inputMode = ref<InputMode>('constant');

type SynapseType = 'static' | 'stp' | 'stdp';
const synapseType = ref<SynapseType>('static');

// --- 共享參數 ---
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

// --- STDP 專屬參數 ---
const stdpParams = reactive({
  A_plus: 0.008,
  A_minus: 0.0088,
  tau_stdp: 20,
});

// --- CUBA 專屬參數 ---
const cubaParams = reactive({
  V_th: -55,
  V_reset: -75,
  V_L: -75,
  g_L: 10,  // nS
  C_m: 100, // pF
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
  tref: 2,
});

// --- ALIF 專屬參數 ---
const enableAdaptation = ref(false);
const alifParams = reactive({
  tau_w: 100, // ms
  b: 20,      // pA
});

// --- 數據歷史 ---
const voltageHistory = ref<number[]>([]);
const currentHistory = ref<number[]>([]);
const weightHistory = ref<number[]>([]);
const neuronSpikeTimes = ref<number[]>([]);
const poissonSpikeTimes = ref<number[]>([]);

// --- 分析相關數據 ---
const cvISI = ref(0);
const fiCurveData = ref<{ current: number; freq: number }[]>([]);
const isCalculatingFI = ref(false);

const runSimulation = () => {
  const network = new SNNNetwork();
  const params = modelType.value === 'cuba' ? cubaParams : cobaParams;

  // 1. 建立 Source 節點
  const sourceNode = new SpikeGeneratorNode(poissonRate.value);
  network.addNode('source', sourceNode);

  // 2. 建立 Target 神經元
  const targetNeuron = createNeuron({
    type: enableAdaptation.value ? 'alif' : 'lif',
    V_th: params.V_th,
    V_reset: params.V_reset,
    V_L: params.V_L,
    g_L: params.g_L,
    C_m: params.C_m,
    tref: params.tref,
    tau_w: alifParams.tau_w,
    b: alifParams.b,
  });
  network.addNode('target', targetNeuron);

  // 3. 建立突觸連線
  const { transmission, learningRule } = createSynapseChain({
    dynamicsType: synapseType.value,
    physicsModel: modelType.value,
    weight: poissonPulseStrength.value,
    tauSyn: synapseParams.tau_syn,
    stp: { U0: stpParams.U0, tau_d: stpParams.tau_d, tau_f: stpParams.tau_f },
    stdp: { A_plus: stdpParams.A_plus, A_minus: stdpParams.A_minus, tau_stdp: stdpParams.tau_stdp },
    cobaVE: cobaParams.V_E,
  });

  // 4. 建立並註冊連線 (物理傳遞與學習規則路徑分離)
  network.addConnection(new Connection('source', 'target', transmission, learningRule));
  
  // 5. 建立監聽器
  const targetMonitor = new StateMonitor(network, 'target');
  const sourceMonitor = new StateMonitor(network, 'source');
  const synapseMonitor = new SynapseMonitor(network, 'source', 'target');

  for (let i = 0; i < STEPS; i++) {
    const time = i * DT;
    
    // 外部電流 Mapping
    const iBase = (time >= 100 && time <= 300) ? constantInjection.value : 0;
    const g_L_val = modelType.value === 'cuba' ? cubaParams.g_L : cobaParams.g_L;
    const c_m_val = modelType.value === 'cuba' ? cubaParams.C_m : cobaParams.C_m;
    const tau_m = c_m_val / (typeof g_L_val === 'number' ? g_L_val : 10);
    const iNoise = GWNSource.getNoiseCurrent(noiseSigma.value, tau_m, typeof g_L_val === 'number' ? g_L_val : 10, DT);
    const ext_i = iBase + iNoise;

    const extMap = new Map<string, number>();
    if (inputMode.value === 'constant') {
      extMap.set('target', ext_i);
    } else {
      extMap.set('target', iNoise); 
    }

    if (inputMode.value !== 'poisson') {
       sourceNode.setRate(0);
    }

    // 6. 推進網路 (Monitor 會在 step 內部被自動觸發)
    network.step(DT, time, extMap);
  }

  // 7. 更新響應式數據 (從監聽器抄出來)
  voltageHistory.value = targetMonitor.vHistory;
  currentHistory.value = targetMonitor.iHistory;
  weightHistory.value = synapseMonitor.wHistory;
  neuronSpikeTimes.value = targetMonitor.spikeTimes;
  poissonSpikeTimes.value = inputMode.value === 'poisson' ? sourceMonitor.spikeTimes : [];

  cvISI.value = calculateCV_ISI(targetMonitor.spikeTimes);
};

// SVG 繪圖輔助已移至 chartUtils.ts

// 監聽變動
watch([modelType, inputMode, constantInjection, poissonPulseStrength, poissonRate, noiseSigma, synapseType, synapseParams, stpParams, stdpParams, cubaParams, cobaParams, enableAdaptation, alifParams], () => {
  runSimulation();
}, { deep: true });

let fiTimeout: number | null = null;
watch([modelType, cubaParams, cobaParams, enableAdaptation, alifParams], () => {
  if (fiTimeout) clearTimeout(fiTimeout);
  isCalculatingFI.value = true;
  fiTimeout = window.setTimeout(() => {
    const params = modelType.value === 'cuba' ? cubaParams : cobaParams;
    const iMax = modelType.value === 'cuba' ? 800 : 50;
    const NeuronClass = enableAdaptation.value ? ALIFNeuron : LIFNeuron;
    const finalParams = enableAdaptation.value ? { ...params, ...alifParams } : params;
    
    const decoratorFactory = (base: ISynapseDynamics) => {
      return modelType.value === 'coba'
        ? new CobaSynapse(base, cobaParams.V_E)
        : new CubaSynapse(base);
    };

    // 將 union constructor 直接斷言為 any 以繞過 TypeScript union signature 匹配限制
    fiCurveData.value = generateFICurve(NeuronClass as any, finalParams as any, iMax, 10, 1000, decoratorFactory);

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
      <div class="flex p-1 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <button @click="modelType = 'cuba'" :class="['px-8 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2', modelType === 'cuba' ? 'bg-indigo-600 text-white shadow-indigo-500/50 shadow-lg' : 'text-gray-400 hover:text-gray-200']">
          <span class="w-2 h-2 rounded-full bg-white animate-pulse" v-if="modelType === 'cuba'"></span>
          CUBA Model
        </button>
        <button @click="modelType = 'coba'" :class="['px-8 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-2', modelType === 'coba' ? 'bg-emerald-600 text-white shadow-emerald-500/50 shadow-lg' : 'text-gray-400 hover:text-gray-200']">
          <span class="w-2 h-2 rounded-full bg-white animate-pulse" v-if="modelType === 'coba'"></span>
          COBA Model
        </button>
      </div>
    </div>

    <!-- 參數設定面板 -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 共享輸入設定 -->
      <div class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-yellow-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">輸入訊號源</h2>
        </div>
        <div class="flex p-1 bg-gray-900 rounded-lg gap-1">
          <button @click="inputMode = 'constant'" :class="['flex-1 py-2 rounded-md font-bold transition text-sm', inputMode === 'constant' ? 'bg-gray-600 text-white' : 'text-gray-500']">常數注入</button>
          <button @click="inputMode = 'poisson'" :class="['flex-1 py-2 rounded-md font-bold transition text-sm', inputMode === 'poisson' ? 'bg-orange-600 text-white' : 'text-gray-500']">泊松脈衝</button>
        </div>
        <div class="space-y-4">
          <div v-if="inputMode === 'constant'" class="flex flex-col animate-in fade-in duration-300">
            <div class="flex justify-between items-end mb-2">
              <label class="text-xs text-gray-400 font-bold uppercase">Base Injection (Iinj)</label>
              <span class="text-2xl font-mono text-yellow-400">{{ constantInjection }} <span class="text-xs">pA</span></span>
            </div>
            <input type="range" v-model.number="constantInjection" min="0" max="600" step="10" class="w-full accent-yellow-500" />
          </div>
          <div v-if="inputMode === 'poisson'" class="space-y-4 animate-in fade-in duration-300">
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

      <!-- 突觸動力學設定 (僅在泊松模式顯示) -->
      <div v-if="inputMode === 'poisson'" class="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl space-y-6 animate-in zoom-in-95 duration-300">
        <div class="flex items-center gap-2">
          <div class="w-2 h-6 bg-orange-500 rounded-full"></div>
          <h2 class="text-xl font-bold text-white">突觸動力學 (Synapse)</h2>
        </div>
        <div class="grid grid-cols-3 p-1 bg-gray-900 rounded-lg gap-1">
          <button @click="synapseType = 'static'" :class="['py-2 rounded-md font-bold transition text-[10px]', synapseType === 'static' ? 'bg-orange-600 text-white' : 'text-gray-500']">Static</button>
          <button @click="synapseType = 'stp'" :class="['py-2 rounded-md font-bold transition text-[10px]', synapseType === 'stp' ? 'bg-orange-600 text-white' : 'text-gray-500']">STP</button>
          <button @click="synapseType = 'stdp'" :class="['py-2 rounded-md font-bold transition text-[10px]', synapseType === 'stdp' ? 'bg-purple-600 text-white' : 'text-gray-500']">STDP</button>
        </div>
        <div class="space-y-4">
          <div class="flex flex-col">
            <div class="flex justify-between items-end mb-1">
              <label class="text-[10px] text-gray-400 font-bold uppercase">Decay (τ_syn)</label>
              <span class="text-sm font-mono text-orange-400">{{ synapseParams.tau_syn }} ms</span>
            </div>
            <input type="range" v-model.number="synapseParams.tau_syn" min="0.5" max="20" step="0.5" class="w-full accent-orange-500" />
          </div>
          <div v-if="synapseType === 'stp'" class="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700 animate-in fade-in duration-300">
              <div class="flex flex-col">
                <label class="text-[9px] text-gray-500 uppercase font-bold mb-1">Depression (τ_d)</label>
                <input type="range" v-model.number="stpParams.tau_d" min="10" max="500" step="10" class="w-full accent-orange-400" />
              </div>
              <div class="flex flex-col">
                <label class="text-[9px] text-gray-500 uppercase font-bold mb-1">Facilitation (τ_f)</label>
                <input type="range" v-model.number="stpParams.tau_f" min="10" max="1000" step="10" class="w-full accent-orange-400" />
              </div>
          </div>
          <div v-if="synapseType === 'stdp'" class="space-y-4 pt-4 border-t border-gray-700 animate-in fade-in duration-300">
              <div class="grid grid-cols-2 gap-4">
                  <div class="flex flex-col">
                    <label class="text-[9px] text-purple-400 uppercase font-bold mb-1">LTP rate (A+)</label>
                    <input type="range" v-model.number="stdpParams.A_plus" min="0.001" max="0.05" step="0.001" class="w-full accent-purple-500" />
                  </div>
                  <div class="flex flex-col">
                    <label class="text-[9px] text-purple-400 uppercase font-bold mb-1">LTD rate (A-)</label>
                    <input type="range" v-model.number="stdpParams.A_minus" min="0.001" max="0.05" step="0.001" class="w-full accent-purple-500" />
                  </div>
              </div>
              <div class="flex flex-col">
                <div class="flex justify-between text-[9px] text-purple-400 font-bold uppercase mb-1">
                  <span>Trace Decay (τ_stdp)</span>
                  <span>{{ stdpParams.tau_stdp }} ms</span>
                </div>
                <input type="range" v-model.number="stdpParams.tau_stdp" min="5" max="100" step="1" class="w-full accent-purple-500" />
              </div>
          </div>
        </div>
      </div>

      <!-- 神經元物理特性 -->
      <div :class="['p-6 rounded-xl border shadow-xl transition-all duration-500', modelType === 'cuba' ? 'bg-indigo-900/20 border-indigo-500/50' : 'bg-emerald-900/20 border-emerald-500/50']">
        <div class="flex items-center gap-2 mb-6">
          <div :class="['w-2 h-6 rounded-full', modelType === 'cuba' ? 'bg-indigo-500' : 'bg-emerald-500']"></div>
          <h2 class="text-xl font-bold text-white">神經元物理特性</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
           <div class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Threshold (V_th)</span>
              <span>{{ modelType === 'cuba' ? cubaParams.V_th : cobaParams.V_th }} mV</span>
            </div>
            <input v-if="modelType === 'cuba'" type="range" v-model.number="cubaParams.V_th" min="-70" max="-40" step="1" class="w-full accent-indigo-500" />
            <input v-else type="range" v-model.number="cobaParams.V_th" min="-70" max="-40" step="1" class="w-full accent-emerald-500" />
          </div>
          <div v-if="modelType === 'coba'" class="flex flex-col">
            <div class="flex justify-between text-[10px] text-gray-400 font-bold uppercase mb-1">
              <span>Exc Reversal (V_E)</span>
              <span class="text-emerald-400">{{ cobaParams.V_E }} mV</span>
            </div>
            <input type="range" v-model.number="cobaParams.V_E" min="-20" max="20" step="1" class="w-full accent-emerald-500" />
          </div>
        </div>
        <div class="mt-8 p-4 bg-black/40 rounded border border-white/10">
            <div class="flex items-center justify-between mb-2">
                <span class="text-[10px] text-red-400 font-bold uppercase tracking-widest">Enable ALIF (Adaptation)</span>
                <input type="checkbox" v-model="enableAdaptation" class="accent-red-500" />
            </div>
            <p class="text-[9px] text-gray-500 leading-relaxed italic">
                {{ modelType === 'cuba' ? 'CUBA: 電流模式，輸入直接注入。' : 'COBA: 電導模式，輸入受電壓差調節。' }}
            </p>
        </div>
      </div>
    </div>

    <!-- 視覺化圖表 -->
    <div class="space-y-4">
      <div v-if="inputMode === 'poisson'" class="bg-gray-900 p-4 rounded-lg border border-gray-800">
        <div class="flex justify-between items-center mb-2">
           <h3 class="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Input Spike Train</h3>
           <div v-if="synapseType === 'stdp'" class="flex items-center gap-4 bg-black/40 px-3 py-1 rounded border border-purple-500/30 animate-in fade-in duration-500">
              <span class="text-[9px] text-purple-400 font-bold uppercase">Synaptic Weight Evolution</span>
              <div class="w-48 h-6 relative bg-black rounded">
                <svg viewBox="0 0 400 60" preserveAspectRatio="none" class="w-full h-full">
                  <path :d="'M ' + getWeightPath(weightHistory, poissonPulseStrength)" fill="none" stroke="#a855f7" stroke-width="2" />
                </svg>
              </div>
           </div>
        </div>
        <div class="h-10 relative bg-black rounded border border-gray-900">
          <svg viewBox="0 0 800 50" preserveAspectRatio="none" class="w-full h-full">
            <line v-for="t in poissonSpikeTimes" :key="t" :x1="(t / SIM_DURATION) * 800" y1="5" :x2="(t / SIM_DURATION) * 800" y2="45" stroke="#fb923c" stroke-width="1" opacity="0.6" />
          </svg>
        </div>
      </div>
      <div class="bg-gray-900 p-6 rounded-lg border border-gray-800 shadow-2xl">
        <h3 class="text-xs font-bold text-blue-500 uppercase mb-4 tracking-widest">Membrane Potential (mV)</h3>
        <div class="h-64 relative bg-black rounded overflow-hidden flex">
          <div class="flex flex-col justify-between text-[9px] font-mono text-gray-600 mr-2 py-1"><span>+5</span><span>-40</span><span>-85</span></div>
          <div class="flex-1 relative">
            <svg viewBox="0 0 800 200" preserveAspectRatio="none" class="w-full h-full">
              <line x1="0" y1="50" x2="800" y2="50" stroke="#1a202c" stroke-width="0.5" /><line x1="0" y1="100" x2="800" y2="100" stroke="#1a202c" stroke-width="0.5" /><line x1="0" y1="150" x2="800" y2="150" stroke="#1a202c" stroke-width="0.5" />
              <path :d="'M ' + getVoltagePath(voltageHistory)" fill="none" stroke="#3b82f6" stroke-width="2" />
            </svg>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-gray-900 p-4 rounded-lg border border-gray-800">
          <h3 class="text-xs font-bold text-yellow-500 uppercase mb-2 tracking-widest">Effective Total Current (pA)</h3>
          <div class="h-20 relative bg-black rounded">
            <svg viewBox="0 0 800 60" preserveAspectRatio="none" class="w-full h-full">
              <path :d="'M ' + getCurrentPath(currentHistory)" fill="none" stroke="#eab308" stroke-width="2" class="transition-all duration-300" />
            </svg>
          </div>
        </div>
        <div class="bg-gray-900 p-6 rounded-lg border border-gray-800 shadow-xl flex flex-col">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-xs font-bold text-emerald-500 uppercase tracking-widest">F-I Curve</h3>
            <div v-if="isCalculatingFI" class="flex items-center gap-2"><div class="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div><span class="text-[10px] text-emerald-500 font-bold uppercase">Scanning...</span></div>
          </div>
          <div class="flex-1 flex gap-4">
             <div class="flex-1 h-32 relative bg-black/50 rounded border border-gray-800">
              <svg viewBox="0 0 300 120" preserveAspectRatio="none" class="w-full h-full">
                <line x1="0" y1="60" x2="300" y2="60" stroke="#ffffff05" stroke-width="0.5" /><line x1="150" y1="0" x2="150" y2="120" stroke="#ffffff05" stroke-width="0.5" />
                <path :d="'M ' + getFIPath(fiCurveData, modelType === 'cuba' ? 800 : 50)" fill="none" stroke="#ef4444" stroke-width="3" />
              </svg>
            </div>
            <div class="w-24 flex flex-col justify-center space-y-4" ref="analysisPanel">
              <div class="text-center p-2 bg-black/30 rounded border border-white/5">
                <div class="text-[8px] text-gray-500 uppercase font-bold mb-1">$CV_{ISI}$</div>
                <div class="text-lg font-mono text-blue-400">{{ cvISI.toFixed(3) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type=range] { appearance: none; background: transparent; }
input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #374151; border-radius: 2px; }
input[type=range]::-webkit-slider-thumb { appearance: none; width: 16px; height: 16px; background: white; border-radius: 50%; margin-top: -6px; box-shadow: 0 0 10px rgba(0,0,0,0.5); cursor: pointer; transition: transform 0.1s; }
input[type=range]:active::-webkit-slider-thumb { transform: scale(1.2); }
</style>
