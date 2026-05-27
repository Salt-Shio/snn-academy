export interface LIFParams {
  V_th: number;    // 閾值 (mV)
  V_reset: number; // 脈衝後的重置電位 (mV)
  V_L: number;     // 靜息電位/漏電反轉電位 (mV)
  tau_m: number;   // 膜時間常數 (ms)
  g_L: number;     // 漏電導 (nS)
  tref: number;    // 不應期 (ms)
}

/**
 * 第一階段：最基礎的 Leaky Integrate-and-Fire (LIF) 神經元。
 * 只考慮外部注入電流 (I_inj)，不包含網路與突觸邏輯。
 */
export class LIFNeuron {
  public v: number;                  // 當前膜電位 (mV)
  public hasSpiked: boolean = false; // 當前時間步長是否發生脈衝
  public params: LIFParams;
  
  // protected 修飾符允許未來的子類別 (如 ConductanceLIF) 存取與覆寫
  protected tref_counter: number = 0; // 不應期倒數計時器 (ms)

  constructor(
    params: LIFParams = {
      V_th: -55,
      V_reset: -75,
      V_L: -75,
      tau_m: 10,
      g_L: 10,
      tref: 2,
    }
  ) {
    this.params = params;
    this.v = this.params.V_L; // 初始電位設定為靜息電位
  }

  /**
   * 重置神經元狀態
   */
  public reset(): void {
    this.v = this.params.V_L;
    this.hasSpiked = false;
    this.tref_counter = 0;
  }

  /**
   * 推進一個時間步長 (Euler Method)
   * @param dt 時間步長 (ms)
   * @param I_inj 外部注入電流 (pA)
   * @returns boolean 該步長是否發生脈衝
   */
  public step(dt: number, I_inj: number = 0): boolean {
    this.hasSpiked = false;

    // 1. 處理不應期 (Refractory Period)
    if (this.tref_counter > 0) {
      this.v = this.params.V_reset; // 不應期內電壓鎖定
      this.tref_counter -= dt;
      return false;
    }

    // 2. 檢查是否跨越閾值 (Spike)
    if (this.v >= this.params.V_th) {
      this.triggerSpike();
      return true;
    }

    // 3. 微分方程式數值積分 (Euler Method)
    // dv/dt = (-(v - V_L) + I_inj/g_L) / tau_m
    const dv = (-(this.v - this.params.V_L) + (I_inj / this.params.g_L)) / this.params.tau_m * dt;
    this.v += dv;

    // 4. 更新後再次檢查是否跨越閾值
    if (this.v >= this.params.V_th) {
      this.triggerSpike();
      return true;
    }

    return false;
  }

  /**
   * 觸發脈衝的內部處理邏輯
   */
  protected triggerSpike(): void {
    this.v = this.params.V_reset;
    this.tref_counter = this.params.tref;
    this.hasSpiked = true;
  }
}
