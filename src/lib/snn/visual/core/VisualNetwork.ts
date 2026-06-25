import { VisualNeuron } from './VisualNeuron';
import { VisualConnection } from './VisualConnection';
import { BasicDendrite } from '../parts/BasicDendrite';
import type { SNNNetwork } from '../../network/core/SNNNetwork';
import { ALIFNeuron } from '../../neurons/ALIFNeuron';
import { STPSynapse } from '../../synapses/dynamics/STPSynapse';
import { STDPSynapse } from '../../synapses/dynamics/STDPSynapse';
import { BaseSynapse } from '../../synapses/dynamics/BaseSynapse';

export class VisualNetwork {
  public neurons: Map<string, VisualNeuron> = new Map();
  public connections: VisualConnection[] = [];

  public addNeuron(neuron: VisualNeuron): void {
    this.neurons.set(neuron.id, neuron);
  }

  /**
   * 建立兩個神經元之間的對接連線
   */
  public connect(sourceId: string, targetId: string): void {
    const source = this.neurons.get(sourceId);
    const target = this.neurons.get(targetId);

    if (!source || !target) return;

    // 1. 建立連線物件
    const connection = new VisualConnection(sourceId, targetId);

    // 2. 確定黑線起點 (Source 的小圓中心)
    connection.startPoint = source.getTerminalPosition();

    // 3. 確定黑線終點 (在 Target 上長出一根綠線來迎接)
    // 計算從小圓到大圓的角度
    const angle = Math.atan2(connection.startPoint.y - target.cy, connection.startPoint.x - target.cx);
    
    const dendrite = new BasicDendrite(angle, 25);
    target.addDendrite(dendrite);
    
    // 綠線的末端即為黑線的終點
    connection.endPoint = dendrite.getInputAnchor(target.cx, target.cy, target.soma.radius);

    // 將黑線歸屬於 Source 神經元 (單位 4)
    source.addOutgoingConnection(connection);

    this.connections.push(connection);
  }

  /**
   * 從底層 SNN 網路同步狀態
   * @param snn 數學引擎實例
   */
  public syncStates(snn: SNNNetwork): void {
    // 1. 同步神經元狀態
    this.neurons.forEach((vNode, id) => {
      const snnNode = snn.getNode(id);
      if (snnNode) {
        // 同步發火狀態與膜電位
        vNode.isSpiking = snnNode.hasSpiked;
        vNode.voltage = snnNode.getVoltage();
        vNode.totalCurrent = snnNode.getTotalCurrent();

        // ALIF: 同步適應性電流
        if (snnNode instanceof ALIFNeuron) {
          vNode.adaptationCurrent = snnNode.getAdaptationCurrent();
        }
      }
    });

    // 2. 同步突觸連線狀態
    for (const vConn of this.connections) {
      const snnConn = snn.getConnectionsBetween(vConn.sourceId, vConn.targetId);
      if (!snnConn) continue;

      // 共通：等效電流與驅動力
      vConn.iSyn = snnConn.lastISyn;
      vConn.drivingForce = snnConn.lastDrivingForce;

      // 透過物理層的 dynamics 存取動態層實體
      const dynamics = (snnConn.transmission as any).dynamics;
      if (!dynamics) continue;

      // 訊號強度 (BaseSynapse 的 getter)
      if (dynamics instanceof BaseSynapse) {
        vConn.signalStrength = dynamics.getSignalStrength();
      }

      // STP 專屬
      if (dynamics instanceof STPSynapse) {
        vConn.stpR = dynamics.R;
        vConn.stpU = dynamics.u;
      }

      // STDP 專屬
      if (dynamics instanceof STDPSynapse) {
        vConn.stdpWeight = dynamics.getWeight();
        vConn.stdpP = dynamics.getPreTrace();
        vConn.stdpM = dynamics.getPostTrace();
      }
    }
  }
}

