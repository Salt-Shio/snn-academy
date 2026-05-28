/**
 * 電導提供者：支援固定數值或隨時間變化的函數。
 */
export type ConductanceProvider = number | ((t: number, v: number) => number);

export interface LIFParams {
  V_th: number;       // 閾值 (mV)
  V_reset: number;    // 重置電位 (mV)
  V_L: number;        // 漏電流反轉電位 (mV)
  g_L: ConductanceProvider; // 漏電導 (nS)
  C_m: number;        // 膜電容 (pF)
  V_E: number;        // 興奮性反轉電位 (mV)
  V_I: number;        // 抑制性反轉電位 (mV)
  tref: number;       // 不應期 (ms)
}

/**
 * 進階階段：電導基礎的 Leaky Integrate-and-Fire (COBA LIF) 神經元。
 * 特點：
 * 1. 遵循與 CUBA 相同的參數介面與 step 簽章。
 * 2. 突觸輸入 syn_input 被解釋為動態電導 (nS)，產生與電壓相關的驅動力。
 */
export class LIFNeuron {
  public v: number;
  public hasSpiked: boolean = false;
  public params: LIFParams;
  
  protected tref_counter: number = 0;

  constructor(params: LIFParams) {
    this.params = params;
    this.v = this.params.V_L;
  }

  private resolveG(provider: ConductanceProvider, t: number, v: number): number {
    return typeof provider === 'number' ? provider : provider(t, v);
  }

  public reset(): void {
    this.v = this.params.V_L;
    this.hasSpiked = false;
    this.tref_counter = 0;
  }

  /**
   * 推進一個時間步長
   * @param dt 時間步長 (ms)
   * @param t 當前模擬時間 (ms)
   * @param syn_input 突觸輸入 (在 COBA 中視為 nS)
   * @param ext_current 外部注入電流 (直接作用於 dV/dt, 單位 pA)
   */
  public step(dt: number, t: number, syn_input: number = 0, ext_current: number = 0): boolean {
    this.hasSpiked = false;

    if (this.tref_counter > 0) {
      this.v = this.params.V_reset;
      this.tref_counter -= dt;
      return false;
    }

    if (this.v >= this.params.V_th) {
      this.triggerSpike();
      return true;
    }

    const current_gL = this.resolveG(this.params.g_L, t, this.v);

    // COBA 核心解釋：突觸輸入是電導 (開大通道)
    // I = -g * (V - V_rev)
    const i_leak = -current_gL * (this.v - this.params.V_L);
    const i_syn = -syn_input * (this.v - this.params.V_E); 
    const i_ext = ext_current;

    const total_i = i_leak + i_syn + i_ext;

    const dv = (total_i / this.params.C_m) * dt;
    this.v += dv;

    if (!Number.isFinite(this.v)) {
      this.v = this.params.V_reset;
    }

    if (this.v >= this.params.V_th) {
      this.triggerSpike();
      return true;
    }

    return false;
  }

  protected triggerSpike(): void {
    this.v = this.params.V_reset;
    this.tref_counter = this.params.tref;
    this.hasSpiked = true;
  }
}
