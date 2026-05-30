import type { INetworkNode } from './INetworkNode';
import { PoissonSource } from '../PoissonSource';

/**
 * 純脈衝產生器節點。
 * 用於模擬網路中的隨機輸入源（如背景噪聲或前級輸入）。
 * 它不具備物理膜電位，僅根據 Poisson 機率產生 Spike。
 */
export class SpikeGeneratorNode implements INetworkNode {
  public hasSpiked: boolean = false;
  private pSource: PoissonSource;

  /**
   * @param rate 期望的平均放電頻率 (Hz)
   */
  constructor(rate: number) {
    this.pSource = new PoissonSource(rate);
  }

  /**
   * 脈衝產生器無實體電壓，回傳 0。
   */
  public getVoltage(): number {
    return 0;
  }

  /**
   * 推進一個時間步長。
   */
  public step(dt: number, _time: number, _syn_input: number, _ext_current: number): boolean {
    this.hasSpiked = this.pSource.step(dt);
    return this.hasSpiked;
  }

  public reset(): void {
    this.hasSpiked = false;
  }

  /**
   * 更新放電頻率
   */
  public setRate(rate: number): void {
    this.pSource = new PoissonSource(rate);
  }
}
