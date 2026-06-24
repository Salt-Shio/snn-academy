<script setup lang="ts">
import { ref } from 'vue';
import BasicLIFSandbox from './components/BasicLIFSandbox.vue';
import TopologyView from './components/TopologyView.vue';

// 定義視圖模式
type ViewMode = 'sandbox' | 'topology';
const currentView = ref<ViewMode>('topology');
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-200 font-sans">
    <!-- 導航 -->
    <nav class="flex justify-center gap-12 py-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
      <button 
        @click="currentView = 'topology'"
        :class="['text-xs font-black tracking-[0.2em] uppercase transition-all px-8 py-2 rounded-full border', currentView === 'topology' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'border-transparent text-slate-500 hover:text-slate-300']"
      >
        Network Topology
      </button>
      <button 
        @click="currentView = 'sandbox'"
        :class="['text-xs font-black tracking-[0.2em] uppercase transition-all px-8 py-2 rounded-full border', currentView === 'sandbox' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'border-transparent text-slate-500 hover:text-slate-300']"
      >
        LIF Sandbox
      </button>
    </nav>

    <!-- 主要檢視區 -->
    <main class="w-full max-w-7xl mx-auto p-8">
      <Transition name="page-fade" mode="out-in">
        <div :key="currentView">
          <div v-if="currentView === 'topology'" class="space-y-6">
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-white tracking-tight">Topology Controller (3x2)</h2>
              <p class="text-xs text-slate-500 font-mono italic">Phase 2: Controller Integrated</p>
            </div>
            <TopologyView />
          </div>
          <div v-else>
            <BasicLIFSandbox />
          </div>
        </div>
      </Transition>
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  background-color: #020617;
}
.page-fade-enter-active, .page-fade-leave-active {
  transition: all 0.3s ease;
}
.page-fade-enter-from, .page-fade-leave-to {
  opacity: 0;
  transform: translateY(5px);
}
</style>
