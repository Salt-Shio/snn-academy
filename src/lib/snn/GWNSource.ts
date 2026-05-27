/**
 * 高斯白雜訊產生器 (Gaussian White Noise Generator)
 * 使用 Box-Muller 轉換產生標準常態分佈 N(0, 1) 的樣本。
 */
export class GWNSource {
  /**
   * 產生一個標準常態分佈的隨機數
   * @returns number N(0, 1)
   */
  public static next(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  /**
   * 根據給定的雜訊強度 sigma (mV) 產生等效輸入電流 (pA)
   * 公式基於：dv_noise = sigma * sqrt(dt/tau_m) * N(0,1)
   * 換算為等效電流：I_noise = (dv_noise * tau_m * g_L) / dt
   * 化簡得：I_noise = sigma * g_L * sqrt(tau_m / dt) * N(0,1)
   * 
   * @param sigma 雜訊強度 (mV)
   * @param tau_m 膜時間常數 (ms)
   * @param g_L 漏電導 (nS)
   * @param dt 時間步長 (ms)
   * @returns 等效的雜訊電流 (pA)
   */
  public static getNoiseCurrent(sigma: number, tau_m: number, g_L: number, dt: number): number {
    if (sigma <= 0) return 0;
    return sigma * g_L * Math.sqrt(tau_m / dt) * this.next();
  }
}
