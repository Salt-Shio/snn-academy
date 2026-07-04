import { defineConfig } from 'vitepress'
// @ts-ignore — markdown-it-texmath 沒有型別宣告，沿用 MathDrawer.vue 原本的作法
import texmath from 'markdown-it-texmath'
import katex from 'katex'

export default defineConfig({
  title: 'SNN Academy',
  description: 'Spiking Neural Network teaching notes',
  markdown: {
    config: (md) => {
      md.use(texmath, { engine: katex, delimiters: 'dollars' })
    }
  },
  vue: {
    template: {
      compilerOptions: {
        // markdown-it-texmath 把公式包在非標準的 <eq>/<eqn> 標籤裡，
        // 不設這個的話 Vue compiler 會當成未知元件直接忽略內容渲染成空白。
        isCustomElement: (tag) => tag === 'eq' || tag === 'eqn'
      }
    }
  },
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'LIF Neuron', link: '/lif-neuron/biological' },
      { text: 'Example', link: '/example/formula-demo' },
      { text: 'Playground', link: '/playground/second-category' }
      // 之後新增主題時，在這裡多加一個 { text, link }，
      // link 指到該主題底下隨便一篇頁面即可（通常是生物視角那篇）。
    ],
    // 側邊欄依「網址前綴」分組：瀏覽 /lif-neuron/* 底下的頁面時，
    // 只會顯示 '/lif-neuron/' 這組清單，不會混進其他主題/分類。
    // 新增主題時，比照 '/lif-neuron/' 這組的寫法，用該主題的路徑前綴當 key，
    // 整組複製貼上再改內容即可（三階段順序固定：生物 → 電路 → 數學）。
    sidebar: {
      '/lif-neuron/': [
        {
          text: 'LIF Neuron', items: [
            { text: '生物視角', link: '/lif-neuron/biological' },
            { text: '電路視角', link: '/lif-neuron/circuit' },
            { text: '數學模型', link: '/lif-neuron/math' }
          ]
        }
      ],
      '/example/': [
        {
          text: 'Example', items: [
            { text: 'Formula Demo', link: '/example/formula-demo' },
            { text: 'Inline Math', link: '/example/inline-math' }
          ]
        }
      ],
      '/playground/': [
        { text: 'Playground', items: [{ text: 'Second Category', link: '/playground/second-category' }] }
      ]
    }
  },
  head: [['link', { rel: 'icon', href: '/favicon.svg' }]]
})
