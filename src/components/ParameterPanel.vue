<script setup lang="ts">
import { reactive, computed, watch } from 'vue';

// --- 型別定義 ---
export type NeuronType = 'lif' | 'alif';
export type PhysicsModel = 'cuba' | 'coba';
export type SynapseType = 'static' | 'stp' | 'stdp';

export interface NetworkConfig {
  neuronType: NeuronType;
  physicsModel: PhysicsModel;
  synapseType: SynapseType;
  neuron: {
    V_th: number;
    V_reset: number;
    V_L: number;
    g_L: number;
    C_m: number;
    tref: number;
  };
  alif: {
    tau_w: number;
    b: number;
  };
  coba: {
    V_E: number;
  };
  synapse: {
    weight: number;
    tau_syn: number;
  };
  stp: {
    U0: number;
    tau_d: number;
    tau_f: number;
  };
  stdp: {
    A_plus: number;
    A_minus: number;
    tau_stdp: number;
  };
  injection: number;
}

const emit = defineEmits<{
  (e: 'config-change', config: NetworkConfig): void;
}>();

// --- 響應式配置狀態 ---
const config = reactive<NetworkConfig>({
  neuronType: 'lif',
  physicsModel: 'cuba',
  synapseType: 'static',
  neuron: {
    V_th: -55,
    V_reset: -75,
    V_L: -75,
    g_L: 10,
    C_m: 100,
    tref: 2,
  },
  alif: {
    tau_w: 100,
    b: 20,
  },
  coba: {
    V_E: 0,
  },
  synapse: {
    weight: 1500,
    tau_syn: 5,
  },
  stp: {
    U0: 0.5,
    tau_d: 100,
    tau_f: 50,
  },
  stdp: {
    A_plus: 0.008,
    A_minus: 0.0088,
    tau_stdp: 20,
  },
  injection: 10000,
});

// 計算衍生標籤
const weightUnit = computed(() => config.physicsModel === 'cuba' ? 'pA' : 'nS');
const modeLabel = computed(() => {
  const n = config.neuronType === 'lif' ? 'LIF' : 'ALIF';
  const p = config.physicsModel.toUpperCase();
  const s = config.synapseType === 'static' ? 'Static' : config.synapseType.toUpperCase();
  return `${n} + ${p} + ${s}`;
});

// 監聽全部配置變更
watch(config, () => {
  emit('config-change', { ...config });
}, { deep: true, immediate: true });

// 三軸選擇按鈕的公共 class
const btnClass = (active: boolean, color: string) => {
  const base = 'flex-1 py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider';
  return active
    ? `${base} bg-${color}-600 text-white shadow-lg shadow-${color}-500/20`
    : `${base} text-slate-500 hover:text-slate-300`;
};
</script>

<template>
  <div class="param-panel w-[300px] shrink-0 flex flex-col gap-4 overflow-y-auto max-h-[calc(100vh-120px)] pr-2">
    
    <!-- 當前模式標籤 -->
    <div class="text-center py-2 bg-slate-800/80 rounded-lg border border-white/5">
      <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Active Mode</div>
      <div class="text-sm font-mono font-bold text-indigo-400">{{ modeLabel }}</div>
    </div>

    <!-- ============ 1. 模式選擇器 ============ -->
    <div class="space-y-2">
      <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Neuron</div>
      <div class="grid grid-cols-2 p-1 bg-slate-900 rounded-lg gap-1">
        <button @click="config.neuronType = 'lif'" :class="config.neuronType === 'lif' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">LIF</button>
        <button @click="config.neuronType = 'alif'" :class="config.neuronType === 'alif' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-red-600 text-white shadow-lg shadow-red-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">ALIF</button>
      </div>

      <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Physics</div>
      <div class="grid grid-cols-2 p-1 bg-slate-900 rounded-lg gap-1">
        <button @click="config.physicsModel = 'cuba'" :class="config.physicsModel === 'cuba' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">CUBA</button>
        <button @click="config.physicsModel = 'coba'" :class="config.physicsModel === 'coba' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">COBA</button>
      </div>

      <div class="text-[9px] text-slate-500 uppercase font-black tracking-widest">Dynamics</div>
      <div class="grid grid-cols-3 p-1 bg-slate-900 rounded-lg gap-1">
        <button @click="config.synapseType = 'static'" :class="config.synapseType === 'static' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">Static</button>
        <button @click="config.synapseType = 'stp'" :class="config.synapseType === 'stp' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">STP</button>
        <button @click="config.synapseType = 'stdp'" :class="config.synapseType === 'stdp' ? 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'py-1.5 rounded-md font-bold transition-all text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300'">STDP</button>
      </div>
    </div>

    <!-- ============ 2. 神經元參數 ============ -->
    <div class="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-3">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-5 bg-blue-500 rounded-full"></div>
        <h3 class="text-[11px] font-black text-white uppercase tracking-wider">Neuron</h3>
      </div>

      <!-- V_th -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>V_th</span>
          <span class="text-blue-400">{{ config.neuron.V_th }} mV</span>
        </div>
        <input type="range" v-model.number="config.neuron.V_th" min="-70" max="-40" step="1" class="w-full accent-blue-500" />
      </div>

      <!-- V_reset -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>V_reset</span>
          <span class="text-blue-400">{{ config.neuron.V_reset }} mV</span>
        </div>
        <input type="range" v-model.number="config.neuron.V_reset" min="-80" max="-60" step="1" class="w-full accent-blue-500" />
      </div>

      <!-- g_L -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>g_L</span>
          <span class="text-blue-400">{{ config.neuron.g_L }} nS</span>
        </div>
        <input type="range" v-model.number="config.neuron.g_L" min="1" max="50" step="1" class="w-full accent-blue-500" />
      </div>

      <!-- C_m -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>C_m</span>
          <span class="text-blue-400">{{ config.neuron.C_m }} pF</span>
        </div>
        <input type="range" v-model.number="config.neuron.C_m" min="50" max="500" step="10" class="w-full accent-blue-500" />
      </div>

      <!-- t_ref -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>t_ref</span>
          <span class="text-blue-400">{{ config.neuron.tref }} ms</span>
        </div>
        <input type="range" v-model.number="config.neuron.tref" min="0" max="10" step="0.5" class="w-full accent-blue-500" />
      </div>

      <!-- Injection -->
      <div class="flex flex-col pt-2 border-t border-white/5">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>I_ext (injection)</span>
          <span class="text-yellow-400">{{ config.injection }} pA</span>
        </div>
        <input type="range" v-model.number="config.injection" min="0" max="30000" step="500" class="w-full accent-yellow-500" />
      </div>

      <!-- ALIF -->
      <div v-if="config.neuronType === 'alif'" class="pt-2 border-t border-red-500/20 space-y-3 animate-in fade-in duration-300">
        <div class="text-[9px] text-red-400 font-black uppercase tracking-wider">ALIF Adaptation</div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>τ_w</span>
            <span class="text-red-400">{{ config.alif.tau_w }} ms</span>
          </div>
          <input type="range" v-model.number="config.alif.tau_w" min="10" max="500" step="10" class="w-full accent-red-500" />
        </div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>b</span>
            <span class="text-red-400">{{ config.alif.b }} pA</span>
          </div>
          <input type="range" v-model.number="config.alif.b" min="0" max="100" step="1" class="w-full accent-red-500" />
        </div>
      </div>
    </div>

    <!-- ============ 3. COBA 參數 (條件渲染) ============ -->
    <div v-if="config.physicsModel === 'coba'" class="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/30 space-y-3 animate-in fade-in duration-300">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
        <h3 class="text-[11px] font-black text-white uppercase tracking-wider">COBA</h3>
      </div>
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>V_E (Reversal)</span>
          <span class="text-emerald-400">{{ config.coba.V_E }} mV</span>
        </div>
        <input type="range" v-model.number="config.coba.V_E" min="-20" max="20" step="1" class="w-full accent-emerald-500" />
      </div>
    </div>

    <!-- ============ 4. 突觸參數 ============ -->
    <div class="bg-slate-800/50 p-4 rounded-xl border border-white/5 space-y-3">
      <div class="flex items-center gap-2">
        <div class="w-1.5 h-5 bg-orange-500 rounded-full"></div>
        <h3 class="text-[11px] font-black text-white uppercase tracking-wider">Synapse</h3>
      </div>

      <!-- Weight -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>Weight (w)</span>
          <span class="text-orange-400">{{ config.synapse.weight }} {{ weightUnit }}</span>
        </div>
        <input type="range" v-model.number="config.synapse.weight" :min="config.physicsModel === 'cuba' ? 100 : 1" :max="config.physicsModel === 'cuba' ? 5000 : 100" :step="config.physicsModel === 'cuba' ? 100 : 1" class="w-full accent-orange-500" />
      </div>

      <!-- τ_syn -->
      <div class="flex flex-col">
        <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
          <span>τ_syn</span>
          <span class="text-orange-400">{{ config.synapse.tau_syn }} ms</span>
        </div>
        <input type="range" v-model.number="config.synapse.tau_syn" min="0.5" max="20" step="0.5" class="w-full accent-orange-500" />
      </div>

      <!-- STP -->
      <div v-if="config.synapseType === 'stp'" class="pt-2 border-t border-orange-500/20 space-y-3 animate-in fade-in duration-300">
        <div class="text-[9px] text-orange-400 font-black uppercase tracking-wider">STP (Tsodyks-Markram)</div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>U₀</span>
            <span class="text-orange-300">{{ config.stp.U0 }}</span>
          </div>
          <input type="range" v-model.number="config.stp.U0" min="0.05" max="1.0" step="0.05" class="w-full accent-orange-400" />
        </div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>τ_D</span>
            <span class="text-orange-300">{{ config.stp.tau_d }} ms</span>
          </div>
          <input type="range" v-model.number="config.stp.tau_d" min="10" max="500" step="10" class="w-full accent-orange-400" />
        </div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>τ_F</span>
            <span class="text-orange-300">{{ config.stp.tau_f }} ms</span>
          </div>
          <input type="range" v-model.number="config.stp.tau_f" min="10" max="1000" step="10" class="w-full accent-orange-400" />
        </div>
      </div>

      <!-- STDP -->
      <div v-if="config.synapseType === 'stdp'" class="pt-2 border-t border-purple-500/20 space-y-3 animate-in fade-in duration-300">
        <div class="text-[9px] text-purple-400 font-black uppercase tracking-wider">STDP Learning</div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>A+ (LTP)</span>
            <span class="text-purple-400">{{ config.stdp.A_plus }}</span>
          </div>
          <input type="range" v-model.number="config.stdp.A_plus" min="0.001" max="0.05" step="0.001" class="w-full accent-purple-500" />
        </div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>A- (LTD)</span>
            <span class="text-purple-400">{{ config.stdp.A_minus }}</span>
          </div>
          <input type="range" v-model.number="config.stdp.A_minus" min="0.001" max="0.05" step="0.001" class="w-full accent-purple-500" />
        </div>
        <div class="flex flex-col">
          <div class="flex justify-between text-[9px] text-slate-400 font-bold uppercase mb-0.5">
            <span>τ_STDP</span>
            <span class="text-purple-400">{{ config.stdp.tau_stdp }} ms</span>
          </div>
          <input type="range" v-model.number="config.stdp.tau_stdp" min="5" max="100" step="1" class="w-full accent-purple-500" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
input[type=range] { appearance: none; background: transparent; }
input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 3px; background: #334155; border-radius: 2px; }
input[type=range]::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; background: white; border-radius: 50%; margin-top: -5.5px; box-shadow: 0 0 8px rgba(0,0,0,0.4); cursor: pointer; transition: transform 0.1s; }
input[type=range]:active::-webkit-slider-thumb { transform: scale(1.2); }

.param-panel::-webkit-scrollbar { width: 4px; }
.param-panel::-webkit-scrollbar-track { background: transparent; }
.param-panel::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
</style>
