export type NodeStatus = 'content' | 'marker' | 'developing'

/** 一個主題（對應 docs/academy/{id}/ 資料夾），驅動 sidebar 分組 */
export interface TopicMeta {
  id: string
  sidebarText: string
  /** VitePress sidebar 的路徑前綴 key，務必以斜線結尾 */
  path: `/academy/${string}/`
}

/** 知識樹節點，status === 'content' 時同時驅動 sidebar 條目。版面座標另外放在 academy-layout.ts。 */
export interface AcademyNode {
  id: string
  /** 樹狀圖顯示文字，用 '\n' 換行 */
  label: string
  status: NodeStatus
  link: string | null
  /** 只有 status === 'content' 才填，用於衍生 sidebar */
  sidebar?: {
    topic: string   // 對應 TopicMeta.id
    text: string    // sidebar 顯示文字（可與 label 不同，label 給樹狀圖用通常較短）
    order: number   // 同一 topic 內排序，小的在前
  }
}

export interface AcademyEdge {
  source: string
  target: string
}

/** 入口主題 id，nav 上「Academy」連結會指向這個主題的第一篇內容頁 */
export const entryTopicId = 'lif'

export const topics: TopicMeta[] = [
  { id: 'lif', sidebarText: 'LIF 神經元', path: '/academy/lif/' }
]

export const nodes: AcademyNode[] = [
  { id: 'origin', label: 'LIF 起源', status: 'marker', link: null },
  { id: 'bio', label: '生物', status: 'content',
    link: '/academy/lif/biological-concept',
    sidebar: { topic: 'lif', text: '生物的概念', order: 1 } },
  { id: 'circuit', label: '等效電路', status: 'content',
    link: '/academy/lif/circuit-concept',
    sidebar: { topic: 'lif', text: '等效電路的概念', order: 2 } },
  { id: 'math', label: 'LIF 公式', status: 'content',
    link: '/academy/lif/differential-equation',
    sidebar: { topic: 'lif', text: '微分方程', order: 3 } },
  { id: 'analysis', label: 'LIF\n相關性分析', status: 'developing', link: null },
  { id: 'series', label: '神經元連接', status: 'content',
    link: '/academy/lif/neuron-connection',
    sidebar: { topic: 'lif', text: '神經元連接', order: 4 } }
]

export const edges: AcademyEdge[] = [
  { source: 'origin', target: 'bio' },
  { source: 'bio', target: 'circuit' },
  { source: 'circuit', target: 'math' },
  { source: 'math', target: 'analysis' },
  { source: 'math', target: 'series' }
]

/** 給 config.ts：把 nodes/topics 衍生成 VitePress 的 sidebar 設定 */
export function buildSidebar(): Record<string, { text: string; items: { text: string; link: string }[] }[]> {
  const sidebar: Record<string, { text: string; items: { text: string; link: string }[] }[]> = {}
  for (const topic of topics) {
    const items = nodes
      .filter((n): n is AcademyNode & { sidebar: NonNullable<AcademyNode['sidebar']>; link: string } =>
        n.status === 'content' && n.link !== null && n.sidebar?.topic === topic.id)
      .sort((a, b) => a.sidebar.order - b.sidebar.order)
      .map((n) => ({ text: n.sidebar.text, link: n.link }))
    sidebar[topic.path] = [{ text: topic.sidebarText, items }]
  }
  return sidebar
}

/** 給 config.ts 的 nav 用：取入口主題第一篇內容頁的連結 */
export function entryLink(): string {
  const first = nodes
    .filter((n) => n.status === 'content' && n.sidebar?.topic === entryTopicId)
    .sort((a, b) => (a.sidebar?.order ?? 0) - (b.sidebar?.order ?? 0))[0]
  if (!first?.link) throw new Error(`entry topic "${entryTopicId}" 沒有任何 content 節點`)
  return first.link
}
