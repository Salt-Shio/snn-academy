import type { ISynapse } from './ISynapse';

/**
 * 突觸抽象基礎類別，提供共通的權重與衰減管理。
 */
export abstract class BaseSynapse implements ISynapse {
  protected signalStrength: number = 0;
  public weight: number;
  public tauSyn: number;
  /**
   * @param weight 最大權重 (pA 或 nS)
   * @param tauSyn 電導/電流衰減時間常數 (ms)
   */
  constructor(weight: number, tauSyn: number) {
    this.weight = weight;
    this.tauSyn = tauSyn;
  }

  /**
   * 基礎指數衰減邏輯
   */
  protected decay(dt: number): void {
    if (this.tauSyn > 0) {
      this.signalStrength -= (this.signalStrength / this.tauSyn) * dt;
    } else {
      // 若 tau 為 0，下一個時間步長訊號直接歸零，模擬 delta 脈衝
      this.signalStrength = 0;
    }
    
    // 防止極小值抖動
    if (this.signalStrength < 1e-10) {
      this.signalStrength = 0;
    }
  }

  public reset(): void {
    this.signalStrength = 0;
  }

  public abstract step(dt: number, preSpike: boolean, postVoltage?: number): number;
}
