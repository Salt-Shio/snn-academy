import type { SNNNetwork } from '../core/SNNNetwork';

/**
 * 突觸監聽器。
 * 專門用於監聽網路連線中的動態權重變化。
 * 透過 ISynapsePhysics.getDynamics().getMonitorData() 介面存取，不依賴具體類別。
 */
export class SynapseMonitor {
  public wHistory: number[] = [];
  
  private sourceId: string;
  private targetId: string;

  constructor(network: SNNNetwork, sourceId: string, targetId: string) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    network.addStepListener(() => {
      this.record(network);
    });
  }

  private record(net: SNNNetwork): void {
    const physicsSynapse = net.getSynapse(this.sourceId, this.targetId);
    if (!physicsSynapse) return;

    // 透過介面取得動態層的監控快照
    const monitorData = physicsSynapse.getDynamics().getMonitorData();

    if (monitorData.stdpWeight !== undefined) {
      this.wHistory.push(monitorData.stdpWeight);
    }
  }

  public reset(): void {
    this.wHistory = [];
  }
}

