<script setup lang="ts">
import BasicLIFSandbox from './components/BasicLIFSandbox.vue';
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-200 font-sans">
    <!-- 導航 (僅保留標題或基礎結構) -->
    <nav class="flex justify-center gap-12 py-6 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-50">
      <h1 class="text-xs font-black tracking-[0.2em] uppercase text-indigo-500">
        SNN Research Academy - Core Simulation
      </h1>
    </nav>

    <!-- 主要檢視區 -->
    <main class="w-full">
      <div class="p-8">
        <BasicLIFSandbox />
      </div>
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
