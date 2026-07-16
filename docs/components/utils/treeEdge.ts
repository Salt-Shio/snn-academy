export interface TreeNodePoint {
  x: number
  y: number
}

/**
 * 計算兩個圓形節點之間的平滑貝茲曲線路徑。
 * 起點沿「圓心連線方向」貼齊來源圓周(自然的出發角度)；
 * 終點固定在目標圓的正上方(12 點鐘方向)並以垂直切線進入，
 * 讓所有連線看起來都是「從上方接進節點」的一致視覺風格。
 * 弧度(bow)依起訖點的垂直距離等比縮放，避免左右偏移過大時被拗成尖角。
 */
export function getSmoothEdgePath(
  source: TreeNodePoint,
  target: TreeNodePoint,
  nodeRadius: number,
  endMarkerOverlap: number
): string {
  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy) || 1
  const unitX = dx / distance
  const unitY = dy / distance

  // 起點：沿實際方向貼齊來源圓周，維持自然的出發角度。
  const startX = source.x + unitX * nodeRadius
  const startY = source.y + unitY * nodeRadius

  // 終點：不看方向，固定貼在目標圓正上方。
  const endX = target.x
  const endY = target.y - (nodeRadius + endMarkerOverlap)

  // 下限 40，避免起訖點垂直距離太小時弧度趨近於 0 變成硬折線。
  const bow = -Math.max(Math.abs(endY - startY) * 0.5, 40)

  // cp1：沿起點的出發方向延伸，讓曲線一開始貼合真實角度。
  const cp1X = startX + unitX * bow
  const cp1Y = startY + unitY * bow
  // cp2：固定在終點正下方，強迫曲線以垂直切線「從正上方」進入目標節點。
  const cp2X = endX
  const cp2Y = endY + bow

  return `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`
}
