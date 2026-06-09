import { VisualNetwork } from '../core/VisualNetwork';
import { VisualNeuron } from '../core/VisualNeuron';
import { BasicSoma } from '../parts/BasicSoma';
import { BasicAxon } from '../parts/BasicAxon';
import { BasicTerminal } from '../parts/BasicTerminal';

/**
 * 專門負責生成 3x2 前饋網路視覺佈局的工廠
 */
export class FeedforwardLayout {
  public static create3x2(
    startX: number = 100,
    startY: number = 100,
    layerSpacing: number = 400,
    nodeSpacing: number = 120
  ): VisualNetwork {
    const vNet = new VisualNetwork();

    const preCount = 3;
    const postCount = 2;

    // 1. 建立 Pre Nodes (Layer 1)
    for (let i = 0; i < preCount; i++) {
      const id = `pre-${i}`;
      const cx = startX;
      const cy = startY + i * nodeSpacing;
      
      const neuron = new VisualNeuron(id, cx, cy, {
        soma: new BasicSoma(25),
        axon: new BasicAxon(120),
        terminal: new BasicTerminal(6)
      });
      vNet.addNeuron(neuron);
    }

    // 2. 建立 Post Nodes (Layer 2)
    const vOffset = ((preCount - 1) * nodeSpacing - (postCount - 1) * nodeSpacing) / 2;
    for (let j = 0; j < postCount; j++) {
      const id = `post-${j}`;
      const cx = startX + layerSpacing;
      const cy = startY + vOffset + j * nodeSpacing;

      const neuron = new VisualNeuron(id, cx, cy, {
        soma: new BasicSoma(25),
        axon: new BasicAxon(120),
        terminal: new BasicTerminal(6)
      });
      vNet.addNeuron(neuron);
    }

    // 3. 執行全連接 (All-to-All)
    for (let i = 0; i < preCount; i++) {
      for (let j = 0; j < postCount; j++) {
        vNet.connect(`pre-${i}`, `post-${j}`);
      }
    }

    return vNet;
  }
}
