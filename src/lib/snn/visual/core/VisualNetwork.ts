import { VisualNeuron } from './VisualNeuron';
import { VisualConnection } from './VisualConnection';
import { BasicDendrite } from '../parts/BasicDendrite';
import type { SNNNetwork } from '../../network/core/SNNNetwork';

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
   * 從底層 SNN 網路同步狀態。
   * 透過介面方法存取所有資料，不依賴任何具體類別。
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

        // 適應性電流 (僅 ALIF 模型提供此方法)
        vNode.adaptationCurrent = snnNode.getAdaptationCurrent?.() ?? 0;
      }
    });

    // 2. 同步突觸連線狀態
    for (const vConn of this.connections) {
      const snnConn = snn.getConnectionsBetween(vConn.sourceId, vConn.targetId);
      if (!snnConn) continue;

      // 共通：等效電流與驅動力
      vConn.iSyn = snnConn.lastISyn;
      vConn.drivingForce = snnConn.lastDrivingForce;

      // 透過介面取得動態層的監控快照
      const monitorData = snnConn.transmission.getDynamics().getMonitorData();

      // 訊號強度 (所有動態類別皆提供)
      vConn.signalStrength = monitorData.signalStrength;

      // STP 專屬 (僅 STPSynapse 回傳)
      vConn.stpR = monitorData.stpR ?? 1.0;
      vConn.stpU = monitorData.stpU ?? 0;

      // STDP 專屬 (僅 STDPSynapse 回傳)
      vConn.stdpWeight = monitorData.stdpWeight ?? 0;
      vConn.stdpP = monitorData.stdpPreTrace ?? 0;
      vConn.stdpM = monitorData.stdpPostTrace ?? 0;
    }
  }
}
