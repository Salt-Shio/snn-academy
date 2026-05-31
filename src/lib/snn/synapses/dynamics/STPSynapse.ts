import { BaseSynapse } from './BaseSynapse';

/**
 * 具有短期可塑性 (STP) 的突觸。
 * 基於 Tsodyks-Markram 模型 (STD/STF)。
 */
export class STPSynapse extends BaseSynapse {
  public R: number = 1.0; // 可用資源比例 (Available resources)
  public u: number = 0.0; // 釋放機率 (Utilization)
  public U0: number;
  public tauD: number;
  public tauF: number;

  /**
   * @param weight 最大權重
   * @param tauSyn 電導/電流衰減時間 (ms)
   * @param U0 基礎釋放機率
   * @param tauD 資源恢復時間 (Depression, ms)
   * @param tauF 易化衰減時間 (Facilitation, ms)
   */
  constructor(
    weight: number,
    tauSyn: number,
    U0: number = 0.5,
    tauD: number = 100,
    tauF: number = 50
  ) {
    super(weight, tauSyn);
    this.U0 = U0;
    this.tauD = tauD;
    this.tauF = tauF;
    this.u = this.U0;
  }

  public reset(): void {
    super.reset();
    this.R = 1.0;
    this.u = this.U0;
  }

  public step(dt: number, preSpike: boolean): number {
    // 1. 狀態衰減/恢復 (尤拉積分)
    // dR/dt = (1-R)/tauD
    this.R += ((1 - this.R) / this.tauD) * dt;
    // du/dt = (U0 - u)/tauF
    this.u -= ((this.u - this.U0) / this.tauF) * dt;
    // 指數衰減電流/電導
    this.decay(dt);

    // 2. 脈衝觸發
    if (preSpike) {
      /**
       * 根據 Tsodyks-Markram 模型：
       * u+ = u- + U0 * (1 - u-)
       * g+ = g- + weight * u+ * R-
       * R+ = R- - u+ * R-
       * 這裡 g 就是 signalStrength，代表當前的電導值 (強度)
       */
      this.u += this.U0 * (1 - this.u);
      
      const impact = this.weight * this.u * this.R;
      this.signalStrength += impact;

      this.R -= this.u * this.R;
    }

    return this.signalStrength;
  }
}
