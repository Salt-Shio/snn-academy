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
      { text: 'Academy', link: '/academy/outline' }
    ],
    sidebar: {
      '/academy/': [
        {
          text: 'Academy', items: [
            { text: '學習大綱', link: '/academy/outline' },
            { text: '生物的概念', link: '/academy/lif/biological-concept' },
            { text: '等效電路的概念', link: '/academy/lif/circuit-concept' },
            { text: '微分方程', link: '/academy/lif/differential-equation' }
          ]
        }
      ]
    }
  },
  head: [['link', { rel: 'icon', href: '/favicon.svg' }]]
})
