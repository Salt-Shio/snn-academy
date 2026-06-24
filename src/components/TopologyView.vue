<script setup lang="ts">
import { ref, reactive } from 'vue';
// 導入視覺層
import { VisualNetwork } from '../lib/snn/visual/core/VisualNetwork';
import { FeedforwardLayout } from '../lib/snn/visual/layout/FeedforwardLayout';
import NetworkSkeletonView from './NetworkSkeletonView.vue';

// 導入數學層
import { SNNNetwork } from '../lib/snn/network/core/SNNNetwork';
import { LIFNeuron } from '../lib/snn/neurons/LIFNeuron';
import { Connection } from '../lib/snn/network/core/Connection';
import { CubaSynapse } from '../lib/snn/synapses/physics/CubaSynapse';
import { StaticSynapse } from '../lib/snn/synapses/dynamics/StaticSynapse';

// --- 1. 初始化視覺網路 (3 Pre, 2 Post) ---
const vNetwork = ref<VisualNetwork>(FeedforwardLayout.create3x2(100, 100, 450, 150));

// --- 2. 初始化數學網路 (鏡像拓樸) ---
const snn = new SNNNetwork();
const currentTime = ref(0);
const dt = 0.1;

// 建立 3x2 數學模型
const setupSNN = () => {
  const params = { V_th: -55, V_reset: -75, V_L: -75, g_L: 10, C_m: 100, tref: 2 };
  
  // 建立 Pre 節點
  for (let i = 0; i < 3; i++) {
    snn.addNode(`pre-${i}`, new LIFNeuron(params));
  }
  // 建立 Post 節點
  for (let j = 0; j < 2; j++) {
    snn.addNode(`post-${j}`, new LIFNeuron(params));
  }
  // 建立 All-to-All 連線 (紅線後的黑色對接線)
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      const syn = new CubaSynapse(new StaticSynapse(1500, 5)); // 1500pA 強度確保傳遞
      snn.addConnection(new Connection(`pre-${i}`, `post-${j}`, syn));
    }
  }
};
setupSNN();

// --- 3. 受控步進邏輯 ---
const preToggles = reactive([false, false, false]);

const doStep = () => {
  const extCurrents = new Map<string, number>();
  
  // 檢查開關，如果為 ON 則注入強電流 (瞬時脈衝)
  preToggles.forEach((on, index) => {
    if (on) {
      extCurrents.set(`pre-${index}`, 10000); // 注入足夠發火的電流
    }
  });

  // 數學推進
  snn.step(dt, currentTime.value, extCurrents);
  currentTime.value += dt;

  // 狀態同步
  vNetwork.value.syncStates(snn);
};

</script>

<template>
  <div class="topology-view space-y-6">
    <!-- 控制面板 -->
    <div class="flex items-center justify-between bg-slate-800/50 p-6 rounded-xl border border-white/5">
      <div class="flex gap-4 items-center">
        <span class="text-xs font-black text-slate-400 uppercase tracking-widest mr-4">Pre-Input Injection</span>
        <div v-for="(_, i) in preToggles" :key="i" class="flex items-center gap-2">
          <label :class="['text-[10px] font-bold px-3 py-1 rounded-md cursor-pointer transition-all border', preToggles[i] ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-slate-900 border-slate-700 text-slate-500']">
            <input type="checkbox" v-model="preToggles[i]" class="hidden" />
            PRE-{{ i }}
          </label>
        </div>
      </div>

      <div class="flex items-center gap-6">
        <div class="text-right">
          <div class="text-[10px] text-slate-500 uppercase font-black">Simulation Time</div>
          <div class="text-xl font-mono text-indigo-400">{{ currentTime.toFixed(1) }} <span class="text-xs">ms</span></div>
        </div>
        <button 
          @click="doStep"
          class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
        >
          Step (0.1ms)
        </button>
      </div>
    </div>

    <!-- 渲染視圖 -->
    <NetworkSkeletonView :network="vNetwork" />

    <!-- 狀態說明 -->
    <div class="p-4 bg-black/20 rounded border border-white/5 text-[10px] text-slate-500 italic">
      * 點擊 PRE 按鈕切換下一毫秒的電流注入狀態。點擊 STEP 執行一次數學運算並同步視覺。
    </div>
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
