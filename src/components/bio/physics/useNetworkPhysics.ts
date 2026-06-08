import { ref, shallowRef } from 'vue';
import * as d3 from 'd3';
import type { NeuronNode, NeuronLink } from '../models/network-models';

export function useNetworkPhysics() {
  const nodes = shallowRef<NeuronNode[]>([]);
  const links = shallowRef<NeuronLink[]>([]);
  const tickCount = ref(0);
  let simulation: d3.Simulation<NeuronNode, NeuronLink> | null = null;

  const somaNode = ref<NeuronNode | null>(null);
  const terminalRootNode = ref<NeuronNode | null>(null);

  /**
   * 初始化單一神經元拓撲資料
   * @param neuronId 唯一識別碼
   * @param anchor 初始位置 {x, y}
   */
  const initNeuronData = (neuronId: string, anchor = { x: 250, y: 300 }) => {
    const n: NeuronNode[] = [];
    const l: NeuronLink[] = [];

    // 1. Soma
    const soma: NeuronNode = { 
      id: `soma-${neuronId}`, 
      neuronId, 
      depth: 0, 
      side: 'core', 
      type: 'soma', 
      x: anchor.x, 
      y: anchor.y 
    };
    somaNode.value = soma;
    n.push(soma);

    // 2. 遞迴生成左側樹突 (100° 到 260°)
    const growLeft = (p: NeuronNode, d: number) => {
      if (d >= 4) return;
      const count = d === 0 ? 6 : (Math.random() > 0.4 ? 2 : 1);
      for (let i = 0; i < count; i++) {
        let angle;
        if (d === 0) {
          angle = (100 + (160 / (count - 1)) * i) * (Math.PI / 180);
        } else {
          angle = Math.PI + (Math.random() - 0.5) * 2;
        }
        const dist = 30 + Math.random() * 20;
        const c: NeuronNode = { 
          id: `L-${neuronId}-${p.id}-${d}-${i}`, 
          neuronId,
          depth: d + 1, 
          side: 'left', 
          type: 'dendrite', 
          x: p.x! + Math.cos(angle) * dist, 
          y: p.y! + Math.sin(angle) * dist 
        };
        n.push(c);
        l.push({ source: p.id, target: c.id, width: 14 * Math.pow(0.52, d) });
        growLeft(c, d + 1);
      }
    };
    growLeft(soma, 0);

    // 3. 軸突末端根部
    const terminalRoot: NeuronNode = { 
      id: `t-root-${neuronId}`, 
      neuronId,
      depth: 0, 
      side: 'core', 
      type: 'terminal', 
      x: anchor.x + 650, 
      y: anchor.y + 80 
    };
    terminalRootNode.value = terminalRoot;
    n.push(terminalRoot);

    // 4. 遞迴生成右側末梢
    const growRight = (p: NeuronNode, d: number) => {
      if (d >= 2) return;
      const count = d === 0 ? 4 : 2; 
      for (let i = 0; i < count; i++) {
        const angle = (Math.random() - 0.5) * 1.5;
        const dist = 25;
        const c: NeuronNode = { 
          id: `R-${neuronId}-${p.id}-${d}-${i}`, 
          neuronId,
          depth: d + 1, 
          side: 'right', 
          type: 'terminal', 
          x: p.x! + Math.cos(angle) * dist, 
          y: p.y! + Math.sin(angle) * dist 
        };
        n.push(c);
        l.push({ source: p.id, target: c.id, width: 6 * Math.pow(0.7, d) });
        growRight(c, d + 1);
      }
    };
    growRight(terminalRoot, 0);

    nodes.value = n;
    links.value = l;
  };

  const startSimulation = (onTick?: () => void) => {
    if (simulation) simulation.stop();

    simulation = d3.forceSimulation<NeuronNode>(nodes.value)
      .force("link", d3.forceLink<NeuronNode, NeuronLink>(links.value).id(d => d.id).distance(45).strength(1))
      .force("charge", d3.forceManyBody().strength(d => d.type === 'soma' ? -500 : -120))
      // 核心修復：強化 Soma 的定位力 (strength 提升到 0.8)，並弱化樹突的全局拉力 (strength 降到 0.02)
      .force("x", d3.forceX<NeuronNode>(d => {
        if (d.type === 'soma') return 250;
        if (d.id.startsWith('t-root')) return 900;
        // 樹突依然傾向左側，但力量極小，避免拉歪 Soma
        return d.side === 'left' ? 120 : 1000;
      }).strength(d => (d.type === 'soma' || d.id.startsWith('t-root')) ? 0.8 : 0.02))
      .force("y", d3.forceY<NeuronNode>(d => d.type === 'soma' ? 300 : (d.id.startsWith('t-root') ? 380 : d.y!)).strength(d => d.type === 'soma' ? 0.8 : 0.1))
      // 讓左側樹突圍繞著 Soma 展開，而不是死板地往左衝
      .force("radialLeft", d3.forceRadial(200, 250, 300).strength(d => d.side === 'left' ? 0.2 : 0))
      .alphaDecay(0.01);

    simulation.on("tick", () => {
      tickCount.value++;
      if (onTick) onTick();
    });
  };

  const dragBehavior = (sim: d3.Simulation<NeuronNode, NeuronLink>) => {
    return d3.drag<any, NeuronNode>()
      .on("start", (event) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on("drag", (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      })
      .on("end", (event) => {
        if (!event.active) sim.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      });
  };

  return {
    nodes,
    links,
    somaNode,
    terminalRootNode,
    tickCount,
    simulation,
    initNeuronData,
    startSimulation,
    dragBehavior
  };
}
