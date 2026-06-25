<script setup lang="ts">
import { computed } from 'vue';
import MarkdownIt from 'markdown-it';
// @ts-ignore
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import { X, BookOpen } from 'lucide-vue-next';

// 引入 KaTeX 樣式表，確保數學公式正確顯示
import 'katex/dist/katex.min.css';

const props = defineProps<{
  isOpen: boolean;
  markdownContent: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
}).use(texmath, {
  engine: katex,
  delimiters: 'dollars',
});

const htmlContent = computed(() => {
  if (!props.markdownContent) return '<p class="text-slate-500 italic text-sm">請選擇項目以查看公式...</p>';
  return md.render(props.markdownContent);
});
</script>

<template>
  <!-- Backdrop -->
  <Transition name="fade">
    <div v-if="isOpen" class="fixed inset-0 bg-slate-950/20 backdrop-blur-sm z-40 transition-opacity" @click="emit('close')"></div>
  </Transition>

  <!-- Drawer -->
  <Transition name="slide">
    <div 
      v-if="isOpen" 
      class="fixed right-0 top-0 bottom-0 w-full max-w-[450px] bg-slate-900/95 backdrop-blur-xl border-l border-white/10 z-50 shadow-2xl shadow-black/80 flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-white/5 bg-slate-950/50">
        <div class="flex items-center gap-3">
          <BookOpen class="w-5 h-5 text-indigo-400" />
          <h2 class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Math Documentation</h2>
        </div>
        <button 
          @click="emit('close')"
          class="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-8 custom-scrollbar">
        <div class="markdown-body" v-html="htmlContent"></div>
      </div>
    </div>
  </Transition>
</template>

<style>
@reference "tailwindcss";
/* Markdown Content Styling */
.markdown-body {
  @apply text-slate-300 text-sm leading-loose;
  font-family: system-ui, -apple-system, sans-serif;
}
.markdown-body h1 {
  @apply text-2xl font-black text-white mb-8 tracking-tight;
}
.markdown-body h2 {
  @apply text-[11px] font-black text-indigo-400 mt-10 mb-4 tracking-widest uppercase border-b border-white/5 pb-2;
}
.markdown-body p {
  @apply mb-5;
}
.markdown-body ul {
  @apply list-disc pl-5 mb-5 space-y-2 text-slate-400;
}
.markdown-body li {
  @apply pl-1;
}
.markdown-body strong {
  @apply text-indigo-200 font-bold;
}
.markdown-body hr {
  @apply border-white/10 my-8;
}

/* KaTeX Styling Override */
.markdown-body .katex-display {
  @apply my-6 overflow-x-auto overflow-y-hidden py-4 px-2 bg-black/40 rounded-xl border border-white/5 text-[1.1em] shadow-inner;
}
.markdown-body .katex {
  color: #c7d2fe; /* indigo-200 */
}

/* Animations */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
