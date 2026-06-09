import { ref, shallowRef, onUnmounted } from 'vue';
import * as d3 from 'd3';
import type { NeuronNode, NeuronLink } from '../models/network-models';

export function useNetworkPhysics() {
  const nodes = shallowRef<NeuronNode[]>([]);
  const links = shallowRef<NeuronLink[]>([]);
  const tickCount = ref(0);
  let simulation: d3.Simulation<NeuronNode, NeuronLink> | null = null;

  const somaNode = ref<NeuronNode | null>(null);
  const terminalRootNode = ref<NeuronNode | null>(null);
  const terminalLeafIds = ref<string[]>([]);
  const anchors = ref({
    soma: { x: 250, y: 300 },
    terminal: { x: 900, y: 380 }
  });

  /**
   * 初始化單一神經元拓撲資料
   * @param neuronId 唯一識別碼
   * @param somaX 初始 X
   * @param somaY 初始 Y
   */
  const initNeuronData = (neuronId: string, somaX = 250, somaY = 300) => {
    anchors.value.soma = { x: somaX, y: somaY };
    anchors.value.terminal = { x: somaX + 650, y: somaY + 80 };

    const n: NeuronNode[] = [];
    const l: NeuronLink[] = [];

    // 1. Soma
    const soma: NeuronNode = { 
      id: `soma-${neuronId}`, 
      neuronId, 
      depth: 0, 
      type: 'soma', 
      x: anchors.value.soma.x, 
      y: anchors.value.soma.y 
    };
    somaNode.value = soma;
    n.push(soma);

    // 2. 遞迴生成樹突 (全方位自然生長)
    const growDendrites = (p: NeuronNode, d: number) => {
      if (d >= 4) return;
      const count = d === 0 ? 8 : (Math.random() > 0.4 ? 2 : 1);
      for (let i = 0; i < count; i++) {
        // 360 度均勻分佈生長
        const angle = ((360 / count) * i + (Math.random() - 0.5) * 30) * (Math.PI / 180);
        const dist = 30 + Math.random() * 20;
        const c: NeuronNode = { 
          id: `D-${neuronId}-${p.id}-${d}-${i}`, 
          neuronId,
          depth: d + 1, 
          type: 'dendrite', 
          x: p.x! + Math.cos(angle) * dist, 
          y: p.y! + Math.sin(angle) * dist 
        };
        n.push(c);
        l.push({ source: p.id, target: c.id, width: 14 * Math.pow(0.52, d) });
        growDendrites(c, d + 1);
      }
    };
    growDendrites(soma, 0);

    // 3. 軸突末端根部
    const terminalRoot: NeuronNode = { 
      id: `t-root-${neuronId}`, 
      neuronId,
      depth: 0, 
      type: 'terminal', 
      x: anchors.value.terminal.x, 
      y: anchors.value.terminal.y 
    };
    terminalRootNode.value = terminalRoot;
    n.push(terminalRoot);

    // 4. 遞迴生成末梢
    const growTerminals = (p: NeuronNode, d: number) => {
      if (d >= 2) return;
      const count = d === 0 ? 4 : 2; 
      for (let i = 0; i < count; i++) {
        const angle = (Math.random() - 0.5) * 1.5;
        const dist = 25;
        const c: NeuronNode = { 
          id: `R-${neuronId}-${p.id}-${d}-${i}`, 
          neuronId,
          depth: d + 1, 
          type: 'terminal', 
          x: p.x! + Math.cos(angle) * dist, 
          y: p.y! + Math.sin(angle) * dist 
        };
        n.push(c);
        l.push({ source: p.id, target: c.id, width: 6 * Math.pow(0.7, d) });
        growTerminals(c, d + 1);
      }
    };
    growTerminals(terminalRoot, 0);

    nodes.value = n;
    links.value = l;

    // 計算末梢葉子節點
    const sources = new Set(l.map(link => link.source));
    terminalLeafIds.value = n
      .filter(node => node.type === 'terminal' && !node.id.startsWith('t-root') && !sources.has(node.id))
      .map(node => node.id);
  };

  const startSimulation = (onTick?: () => void) => {
    if (simulation) simulation.stop();

    simulation = d3.forceSimulation<NeuronNode>(nodes.value)
      .force("link", d3.forceLink<NeuronNode, NeuronLink>(links.value).id(d => d.id).distance(45).strength(1))
      .force("charge", d3.forceManyBody<NeuronNode>().strength(d => d.type === 'soma' ? -500 : -120))
      .force("x", d3.forceX<NeuronNode>(d => d.type === 'soma' ? anchors.value.soma.x : anchors.value.terminal.x)
        .strength(d => (d.type === 'soma' || d.id.startsWith('t-root')) ? 0.8 : 0))
      .force("y", d3.forceY<NeuronNode>(d => d.type === 'soma' ? anchors.value.soma.y : anchors.value.terminal.y)
        .strength(d => (d.type === 'soma' || d.id.startsWith('t-root')) ? 0.8 : 0))
      .force("radial", d3.forceRadial<NeuronNode>(200, anchors.value.soma.x, anchors.value.soma.y).strength(d => d.type === 'dendrite' ? 0.2 : 0))
      .alphaDecay(0.01);

    simulation.on("tick", () => {
      tickCount.value++;
      if (onTick) onTick();
    });
  };

  onUnmounted(() => {
    if (simulation) simulation.stop();
  });

  return {
    nodes,
    links,
    somaNode,
    terminalRootNode,
    terminalLeafIds,
    anchors,
    tickCount,
    initNeuronData,
    startSimulation
  };
}
