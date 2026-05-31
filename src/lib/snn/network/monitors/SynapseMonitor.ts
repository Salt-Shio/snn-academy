import type { SNNNetwork } from '../core/SNNNetwork';
import { STDPSynapse } from '../../synapses/dynamics/STDPSynapse';

/**
 * 突觸監聽器。
 * 專門用於監聽網路連線中的動態權重變化。
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

    // 由於我們採用組合架構，物理裝飾器內部持有 dynamics
    // 我們需要進去拿 dynamics 實體來檢查是否為 STDPSynapse
    // 這裡我們假設裝飾器會暴露一個 dynamics 屬性 (我們需要去補上)
    const dynamics = (physicsSynapse as any).dynamics;
    
    if (dynamics instanceof STDPSynapse) {
      this.wHistory.push(dynamics.getWeight());
    }
  }

  public reset(): void {
    this.wHistory = [];
  }
}
