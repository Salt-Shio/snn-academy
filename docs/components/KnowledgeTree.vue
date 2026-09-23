<script setup lang="ts">
import { getSmoothEdgePath } from './utils/treeEdge'
import { nodes, edges } from '../shared/academy-map'
import { academyLayout } from '../shared/academy-layout'

const NODE_RADIUS = 50
// 端點 marker 換成圓點後，中心點對齊路徑終點；留一點負值使端點微幅重疊，避免抗鋸齒留白縫
const END_MARKER_OVERLAP = -2
const CANVAS_MARGIN = 100 // SVG/容器右下留白，避免最外圈節點貼邊

// 節點/連線資料來自單一事實來源 docs/shared/academy-map.ts（同時驅動 sidebar）。
// 版面座標是手動維護的 docs/shared/academy-layout.ts，格式單純（id -> {x, y}），方便直接改數字調位置。
const posOf = (id: string) => academyLayout[id] ?? { x: 0, y: 0 }

const canvasWidth = Math.max(...nodes.map(n => posOf(n.id).x)) + CANVAS_MARGIN
const canvasHeight = Math.max(...nodes.map(n => posOf(n.id).y)) + CANVAS_MARGIN

// 計算 SVG 貝茲曲線路徑 (實際計算委派給 utils/treeEdge.ts 的純函式)
const getPath = (sourceId: string, targetId: string) => {
  const source = posOf(sourceId);
  const target = posOf(targetId);
  return getSmoothEdgePath(source, target, NODE_RADIUS, END_MARKER_OVERLAP);
};

const isActiveEdge = (sId: string, tId: string) => {
  const s = nodes.find(n => n.id === sId);
  const t = nodes.find(n => n.id === tId);
  return s?.status !== 'developing' && t?.status !== 'developing';
};
</script>

<template>
  <div class="tree-wrapper">
   <div class="tree-scroll">
    <div class="tree-container" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
      <!-- 網格背景 -->
      <div class="grid-bg"></div>

      <!-- 連線層 (SVG) -->
      <svg class="edges-layer" :width="canvasWidth" :height="canvasHeight" :viewBox="`0 0 ${canvasWidth} ${canvasHeight}`">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
            <circle cx="5" cy="5" r="4" fill="#888888" opacity="0.6"/>
          </marker>
          <marker id="arrow-active" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6">
            <circle cx="5" cy="5" r="4" fill="#10b981" />
          </marker>
        </defs>

        <path 
          v-for="(edge, index) in edges" 
          :key="index"
          :d="getPath(edge.source, edge.target)"
          fill="none"
          :stroke="isActiveEdge(edge.source, edge.target) ? '#10b981' : '#888888'"
          :stroke-width="isActiveEdge(edge.source, edge.target) ? 3 : 2"
          :opacity="isActiveEdge(edge.source, edge.target) ? 1 : 0.4"
          :marker-end="isActiveEdge(edge.source, edge.target) ? 'url(#arrow-active)' : 'url(#arrow)'"
        />
      </svg>

      <!-- 節點層 (HTML) -->
      <div class="nodes-layer">
        <template v-for="node in nodes" :key="node.id">
          <!-- 可點擊節點 (使用 a 標籤) -->
          <a
            v-if="node.link"
            :href="node.link"
            class="tree-node is-clickable"
            :class="'status-' + node.status"
            :style="{ left: posOf(node.id).x + 'px', top: posOf(node.id).y + 'px' }"
          >
            <div class="node-circle">
              <span v-for="(line, i) in node.label.split('\n')" :key="i" class="node-text-line">
                {{ line }}
              </span>
            </div>
          </a>
          <!-- 不可點擊節點 (使用 div 標籤) -->
          <div
            v-else
            class="tree-node"
            :class="'status-' + node.status"
            :style="{ left: posOf(node.id).x + 'px', top: posOf(node.id).y + 'px' }"
          >
            <div class="node-circle">
              <span v-for="(line, i) in node.label.split('\n')" :key="i" class="node-text-line">
                {{ line }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </div>
   </div>

    <!-- 圖例：說明三種節點狀態的顏色含義 -->
    <div class="tree-legend">
      <span class="legend-item">
        <span class="legend-dot status-content"></span>可點擊內容
      </span>
      <span class="legend-item">
        <span class="legend-dot status-marker"></span>起點標示
      </span>
      <span class="legend-item">
        <span class="legend-dot status-developing"></span>開發中
      </span>
    </div>
  </div>
</template>

<style scoped>
.tree-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 2rem 0;
  padding: 1rem;
}

.tree-scroll {
  max-width: 100%;
  overflow-x: auto;
}

.tree-container {
  position: relative;
  flex-shrink: 0;
  width: 600px;
  height: 820px;
  border-radius: 12px;
  background-color: var(--vp-c-bg, #1a1a1a); /* Fallback for dark themes */
  border: 1px solid var(--vp-c-divider, #333);
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, rgba(128, 128, 128, 0.2) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(128, 128, 128, 0.2) 1px, transparent 1px);
  background-size: 20px 20px;
  z-index: 0;
}

.edges-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.nodes-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
}

.tree-node {
  position: absolute;
  width: 100px;
  height: 100px;
  margin-top: -50px;
  margin-left: -50px;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none !important;
  opacity: 1 !important; /* 確保節點絕對可見 */
}

.node-circle {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--vp-c-bg-soft, #242424);
  border: 2px solid #888888;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--vp-c-text-1, #dddddd);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  line-height: 1.3;
}

.node-text-line {
  display: block;
}

/* 有內容、可點擊 — 綠色 + 持續發光 */
.status-content .node-circle {
  border-color: #10b981;
  color: #10b981;
  background: var(--vp-c-bg, #1a1a1a);
  animation: glow-pulse-green 2.4s ease-in-out infinite;
}

/* 純標示點，無對應頁面、不可點擊 — 琥珀色 + 持續發光，但視覺上跟綠色內容區隔 */
.status-marker .node-circle {
  border-color: #f59e0b;
  color: #f59e0b;
  background: var(--vp-c-bg, #1a1a1a);
  animation: glow-pulse-amber 2.4s ease-in-out infinite;
}

/* 開發中、不可點擊 — 灰色虛線，無發光 */
.status-developing .node-circle {
  border-color: #666666;
  border-style: dashed;
  color: var(--vp-c-text-2);
  opacity: 0.7;
}

.status-developing {
  cursor: not-allowed;
}

.is-clickable {
  cursor: pointer;
}

.is-clickable:hover .node-circle {
  animation-play-state: paused;
  border-color: #34d399;
  background: #10b981;
  color: white;
  box-shadow: 0 0 24px rgba(16, 185, 129, 0.6);
  transform: scale(1.05);
}

@keyframes glow-pulse-green {
  0%, 100% {
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.3), 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 0 0 20px rgba(16, 185, 129, 0.6), 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

@keyframes glow-pulse-amber {
  0%, 100% {
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.3), 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  50% {
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.6), 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

/* 深色模式特別對比 */
:root.dark .grid-bg {
  opacity: 0.3;
}

/* 圖例：說明三種節點狀態的顏色含義 */
.tree-legend {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.5rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.legend-dot.status-content {
  background: #10b981;
  box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
}

.legend-dot.status-marker {
  background: #f59e0b;
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}

.legend-dot.status-developing {
  background: transparent;
  border: 1.5px dashed #666666;
}

/* 尊重使用者的「減少動態效果」偏好，避免持續脈動動畫造成不適 */
@media (prefers-reduced-motion: reduce) {
  .status-content .node-circle,
  .status-marker .node-circle {
    animation: none;
  }
}
</style>
