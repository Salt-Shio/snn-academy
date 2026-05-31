import type { SNNNetwork } from './SNNNetwork';

/**
 * 狀態監聽器。
 * 負責監聽網路中的特定節點，並在每個時間步長自動記錄其物理狀態（如電壓、電流）。
 * 這實現了模擬與資料記錄的徹底解耦。
 */
export class StateMonitor {
  /** 電壓歷史紀錄 (mV) */
  public vHistory: number[] = [];
  /** 總輸入電流歷史紀錄 (pA) */
  public iHistory: number[] = [];
  /** 該節點發射脈衝的時間點 (ms) */
  public spikeTimes: number[] = [];

  private targetId: string;

  /**
   * @param network 要監聽的網路實例
   * @param targetId 要監聽的節點 ID
   */
  constructor(network: SNNNetwork, targetId: string) {
    this.targetId = targetId;
    // 註冊掛載：讓網路在每次 step 完後自動通知我進行記錄
    network.addStepListener((time, net) => {
      this.record(time, net);
    });
  }

  /**
   * 執行一次狀態抓取 (Pull Model)
   */
  private record(time: number, net: SNNNetwork): void {
    const node = net.getNode(this.targetId);
    if (!node) return;

    // 1. 抓取電壓
    this.vHistory.push(node.getVoltage());
    
    // 2. 抓取總電流
    this.iHistory.push(node.getTotalCurrent());

    // 3. 記錄發火時間點
    if (node.hasSpiked) {
      this.spikeTimes.push(time);
    }
  }

  /**
   * 清除歷史紀錄
   */
  public reset(): void {
    this.vHistory = [];
    this.iHistory = [];
    this.spikeTimes = [];
  }
}
