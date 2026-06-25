import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 1500, // 放寬警告上限到 1.5MB
    rollupOptions: {
      output: {
        // 將肥大的第三方套件獨立打包，避免單一檔案過大
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('markdown-it') || id.includes('katex')) return 'markdown-katex';
            if (id.includes('d3')) return 'd3-vendor';
            return 'vendor';
          }
        }
      }
    }
  }
})
