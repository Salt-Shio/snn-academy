<script setup lang="ts">
import { ref } from 'vue';
// 導入視覺層
import { VisualNetwork } from '../lib/snn/visual/core/VisualNetwork';
import { FeedforwardLayout } from '../lib/snn/visual/layout/FeedforwardLayout';
import NetworkSkeletonView from './NetworkSkeletonView.vue';
import ParameterPanel from './ParameterPanel.vue';
import type { NetworkConfig } from './ParameterPanel.vue';
import MathDrawer from './MathDrawer.vue';

// 預先載入所有 Markdown 文件
const rawDocs = import.meta.glob('../docs/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// 導入數學層
import { SNNNetwork, Connection, createNeuron, createSynapseChain } from '../lib/snn/network';


// --- 1. 初始化視覺網路 (3 Pre, 2 Post) ---
const vNetwork = ref<VisualNetwork>(FeedforwardLayout.create3x2(100, 100, 450, 150));

// --- 2. 數學網路 (響應式重建) ---
let snn = new SNNNetwork();
const currentTime = ref(0);
const dt = 0.1;

// 保存當前配置用於顯示模式判斷
const activeConfig = ref<NetworkConfig | null>(null);

// Math Drawer 狀態
const isDrawerOpen = ref(false);
const drawerContent = ref('');

const handleOpenInfo = (docName: string) => {
  const path = `../docs/${docName}.md`;
  drawerContent.value = rawDocs[path] || `# 找不到文件\n無法載入 ${docName}.md`;
  isDrawerOpen.value = true;
};

/**
 * 根據配置建立整個數學網路
 */
const buildNetwork = (config: NetworkConfig) => {
  snn = new SNNNetwork();
  currentTime.value = 0;


  // 建立 Pre 節點
  for (let i = 0; i < 3; i++) {
    const node = createNeuron({
      type: config.neuronType === 'alif' ? 'alif' : 'lif',
      V_th: config.neuron.V_th,
      V_reset: config.neuron.V_reset,
      V_L: config.neuron.V_L,
      g_L: config.neuron.g_L,
      C_m: config.neuron.C_m,
      tref: config.neuron.tref,
      tau_w: config.alif.tau_w,
      b: config.alif.b,
    });
    snn.addNode(`pre-${i}`, node);
  }

  // 建立 Post 節點
  for (let j = 0; j < 2; j++) {
    const node = createNeuron({
      type: config.neuronType === 'alif' ? 'alif' : 'lif',
      V_th: config.neuron.V_th,
      V_reset: config.neuron.V_reset,
      V_L: config.neuron.V_L,
      g_L: config.neuron.g_L,
      C_m: config.neuron.C_m,
      tref: config.neuron.tref,
      tau_w: config.alif.tau_w,
      b: config.alif.b,
    });
    snn.addNode(`post-${j}`, node);
  }

  // 建立 All-to-All 連線
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const { transmission, learningRule } = createSynapseChain({
        dynamicsType: config.synapseType,
        physicsModel: config.physicsModel,
        weight: config.synapse.weight,
        tauSyn: config.synapse.tau_syn,
        stp: { U0: config.stp.U0, tau_d: config.stp.tau_d, tau_f: config.stp.tau_f },
        stdp: { A_plus: config.stdp.A_plus, A_minus: config.stdp.A_minus, tau_stdp: config.stdp.tau_stdp },
        cobaVE: config.coba.V_E,
      });
      snn.addConnection(new Connection(`pre-${i}`, `post-${j}`, transmission, learningRule));
    }
  }

  // 重建視覺層
  vNetwork.value = FeedforwardLayout.create3x2(100, 100, 450, 150);
};

// --- 3. 配置變更 → 自動重建 ---
const onConfigChange = (config: NetworkConfig) => {
  activeConfig.value = config;
  buildNetwork(config);
};

// --- 4. 受控步進邏輯 ---
const preToggles = ref([false, false, false]);

const doStep = () => {
  const extCurrents = new Map<string, number>();

  // 注入電流
  preToggles.value.forEach((on, index) => {
    if (on) {
      extCurrents.set(`pre-${index}`, activeConfig.value?.injection ?? 10000);
    }
  });

  // 數學推進
  snn.step(dt, currentTime.value, extCurrents);
  currentTime.value += dt;

  // 狀態同步
  vNetwork.value.syncStates(snn);
};

// 連續步進 (多步快進)
const doMultiStep = (count: number) => {
  for (let i = 0; i < count; i++) {
    doStep();
  }
};

// 重置
const doReset = () => {
  snn.reset();
  currentTime.value = 0;
  vNetwork.value.syncStates(snn);
};
</script>

<template>
  <div class="topology-view flex gap-6 relative">
    <!-- 左側: 參數面板 -->
    <ParameterPanel @config-change="onConfigChange" @open-info="handleOpenInfo" />

    <!-- 右側: 主要內容區 -->
    <div class="flex-1 space-y-6 min-w-0">
      <!-- 控制面板 -->
      <div class="flex items-center justify-between bg-slate-800/50 p-5 rounded-xl border border-white/5">
        <div class="flex gap-3 items-center">
          <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-3">Input</span>
          <div v-for="(_, i) in preToggles" :key="i" class="flex items-center">
            <label :class="['text-[10px] font-bold px-3 py-1.5 rounded-md cursor-pointer transition-all border', preToggles[i] ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500']">
              <input type="checkbox" v-model="preToggles[i]" class="hidden" />
              PRE-{{ i }}
            </label>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <div class="text-[9px] text-slate-500 uppercase font-black">Time</div>
            <div class="text-lg font-mono text-indigo-400">{{ currentTime.toFixed(1) }} <span class="text-[10px]">ms</span></div>
          </div>
          <button
            @click="doStep"
            class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            Step
          </button>
          <button
            @click="doMultiStep(10)"
            class="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg font-black text-[10px] uppercase tracking-[0.15em] shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
          >
            ×10
          </button>
          <button
            @click="doMultiStep(100)"
            class="px-4 py-2.5 bg-indigo-800 hover:bg-indigo-700 text-white rounded-lg font-black text-[10px] uppercase tracking-[0.15em] active:scale-95 transition-all"
          >
            ×100
          </button>
          <button
            @click="doReset"
            class="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-black text-[10px] uppercase tracking-[0.15em] active:scale-95 transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      <!-- 渲染視圖 -->
      <NetworkSkeletonView :network="vNetwork" :config="activeConfig" />

      <!-- 說明 -->
      <div class="p-3 bg-black/20 rounded border border-white/5 text-[9px] text-slate-500 italic">
        * 左側面板切換模式與調整參數。PRE 按鈕控制電流注入。Step 推進模擬。點擊面板上的 (i) 查看物理與數學模型細節。
      </div>
    </div>

    <!-- Math Drawer 元件 -->
    <MathDrawer :is-open="isDrawerOpen" :markdown-content="drawerContent" @close="isDrawerOpen = false" />
  </div>
</template>

<style scoped>
.topology-view {
  animation: fade-in 0.5s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
