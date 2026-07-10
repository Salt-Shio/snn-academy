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
      { text: '生物', link: '/biological/neuron-cell' },
      { text: '電路', link: '/circuit/equivalent-circuit' },
      { text: '數學', link: '/math/lif/biological-concept' },
      { text: 'Example', link: '/example/formula-demo' },
      { text: 'Playground', link: '/playground/second-category' }
      // 生物／電路／數學是三個平行的頂層分類（鏡頭），不是主題清單。
      // 生物、電路底下放不綁定特定神經元模型的通用概念頁；
      // 每個主題（如 LIF）掛在數學底下自己開資料夾，
      // 內含站在該主題角度的收斂頁（用虛線引用連回生物/電路的通用頁）+ 該主題的推導頁。
      // 詳見 dev/Content_Architecture_Plan.md。
    ],
    // 側邊欄依「網址前綴」分組：瀏覽 /biological/*、/circuit/*、/math/* 底下的頁面時，
    // 只會顯示對應那組清單，不會混進其他分類。
    // 新增主題時（例如 ALIF），在 '/math/' 這組裡比照 'LIF' 的寫法，
    // 新增一個 { text: '主題名', items: [...] }。
    sidebar: {
      '/biological/': [
        {
          text: '生物', items: [
            { text: '神經細胞', link: '/biological/neuron-cell' }
          ]
        }
      ],
      '/circuit/': [
        {
          text: '電路', items: [
            { text: '等效電路', link: '/circuit/equivalent-circuit' },
            { text: 'FPGA', link: '/circuit/fpga' }
          ]
        }
      ],
      '/math/': [
        {
          text: 'LIF', items: [
            { text: '生物的概念', link: '/math/lif/biological-concept' },
            { text: '等效電路的概念', link: '/math/lif/circuit-concept' },
            { text: '微分方程', link: '/math/lif/differential-equation' }
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
