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
      { text: 'Example', link: '/example/formula-demo' },
      { text: 'Playground', link: '/playground/second-category' }
      // 之後新增分類時，在這裡多加一個 { text, link }，
      // link 指到該分類底下隨便一篇頁面即可（通常是該分類第一篇）。
    ],
    // 側邊欄依「網址前綴」分組：瀏覽 /example/* 底下的頁面時，
    // 只會顯示 '/example/' 這組清單，不會混進其他分類（/playground/ 亦然）。
    // 新增分類時，比照下面任一組的寫法，用該分類的路徑前綴當 key，
    // 整組複製貼上再改內容即可。
    sidebar: {
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
