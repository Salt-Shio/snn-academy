// 知識樹版面座標，跟 academy-map.ts 的內容資料分開放，方便單純調整位置。
// 手動排版，SVG viewBox 隨這份資料的最大值自動撐開（見 KnowledgeTree.vue）。
// 格式：id: { x, y }
export const academyLayout: Record<string, { x: number; y: number }> = {
  'origin': { x: 300, y: 100 },
  'bio': { x: 420, y: 250 },
  'circuit': { x: 200, y: 400 },
  'math': { x: 320, y: 550 },
  'neuron-types': { x: 130, y: 720 },
  'synapse-types': { x: 550, y: 720 },
  'neuron-other': { x: 0, y: 850 },
  'neuron-alif': { x: 120, y: 950 },
  'neuron-lif-base': { x: 280, y: 900 },
  'synapse-cuba': { x: 500, y: 900 },
  'synapse-coba': { x: 680, y: 850 },
  'series': { x: 380, y: 1100 },
}
