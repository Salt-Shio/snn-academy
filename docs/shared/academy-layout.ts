// 知識樹版面座標，跟 academy-map.ts 的內容資料分開放，方便單純調整位置。
// 手動排版，SVG viewBox 隨這份資料的最大值自動撐開（見 KnowledgeTree.vue）。
// 格式：id: { x, y }
export const academyLayout: Record<string, { x: number; y: number }> = {
  origin: { x: 300, y: 100 },
  bio: { x: 420, y: 250 },
  circuit: { x: 200, y: 400 },
  math: { x: 320, y: 550 },
  analysis: { x: 180, y: 720 },
  series: { x: 460, y: 720 },
}
