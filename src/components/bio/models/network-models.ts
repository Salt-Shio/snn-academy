import * as d3 from 'd3';

/**
 * 代表神經網路中的單一節點 (細胞本體、樹突分支點或末梢)
 */
export interface NeuronNode extends d3.SimulationNodeDatum {
  id: string;           // 節點唯一識別碼 (例如: soma-n1, L-n1-0-1)
  neuronId: string;     // 所屬神經元的識別碼 (支援多神經元網路)
  depth: number;        // 分支深度
  type: 'soma' | 'dendrite' | 'terminal';
}

/**
 * 代表節點間的物理連接
 */
export interface NeuronLink extends d3.SimulationLinkDatum<NeuronNode> {
  source: string | NeuronNode;
  target: string | NeuronNode;
  width: number;        // 線條寬度
}

/**
 * 髓鞘渲染點資訊
 */
export interface MyelinPoint {
  x: number;
  y: number;
  angle: number;
  width: number;
}
