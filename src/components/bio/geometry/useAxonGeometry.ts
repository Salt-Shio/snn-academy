import { ref, computed } from 'vue';
import type { NeuronNode, MyelinPoint } from '../models/network-models';

export function useAxonGeometry(
  somaNode: { value: NeuronNode | null },
  terminalRootNode: { value: NeuronNode | null },
  tickCount: { value: number }
) {
  const axonPathRef = ref<SVGPathElement | null>(null);
  const myelinPoints = ref<MyelinPoint[]>([]);

  const axonD = computed(() => {
    // 雖然 tickCount 在這裡沒直接用到，但為了確保隨模擬更新，我們保留對它的依賴感
    const _ = tickCount.value;
    const s = somaNode.value;
    const t = terminalRootNode.value;
    if (!s || !t || s.x === undefined || t.x === undefined) return "";

    const dx = t.x - s.x;
    const dy = t.y - s.y;

    // 貝茲曲線控制點校準 (S 型優美曲線)
    const cp1x = s.x + dx * 0.307;
    const cp1y = s.y + dy * 0.25;
    const cp2x = s.x + dx * 0.615;
    const cp2y = s.y + dy * 2.25;

    return `M ${s.x} ${s.y} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${t.x} ${t.y}`;
  });

  const updateMyelin = () => {
    if (!axonPathRef.value) return;
    try {
      const path = axonPathRef.value;
      const len = path.getTotalLength();
      const pts: MyelinPoint[] = [];
      const count = 11;
      const startOffset = len * 0.18; // 軸丘空間
      const endOffset = len * 0.92;   
      const usableLen = endOffset - startOffset;
      const step = usableLen / (count - 1);

      for (let i = 0; i < count; i++) {
        const d = startOffset + (i * step);
        const p1 = path.getPointAtLength(d);
        const p2 = path.getPointAtLength(Math.min(d + 2, len));
        const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

        const segmentWidth = step * 0.85; 
        pts.push({ x: p1.x, y: p1.y, angle: ang, width: segmentWidth });
      }
      myelinPoints.value = pts;
    } catch (e) {}
  };

  return {
    axonPathRef,
    myelinPoints,
    axonD,
    updateMyelin
  };
}
