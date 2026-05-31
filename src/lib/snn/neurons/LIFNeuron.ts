import type { INetworkNode } from '../network/core/INetworkNode';

export type ConductanceProvider = number | ((t: number, v: number) => number);

export interface LIFParams {
  V_th: number;       // 閾值 (mV)
  V_reset: number;    // 重置電位 (mV)
  V_L: number;        // 漏電流反轉電位 (mV)
  g_L: ConductanceProvider; // 漏電導 (nS)
  C_m: number;        // 膜電容 (pF)
  tref: number;       // 不應期 (ms)
}

/**
 * 統一的 Leaky Integrate-and-Fire (LIF) 神經元模型。
 * 負責純粹的電位積分與脈衝發射邏輯。
 * 突觸層已經過抽象化，傳入的 syn_input 皆為等效輸入電流 (pA)。
 */
export class LIFNeuron implements INetworkNode {
  public v: number;
  public hasSpiked: boolean = false;
  public params: LIFParams;
  
  protected tref_counter: number = 0;
  protected current_i: number = 0; // 當前步長的總輸入電流 (pA)

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
   * 符合 INetworkNode 介面規範
   */
  public getVoltage(): number {
    return this.v;
  }

  /**
   * 符合 INetworkNode 介面規範
   */
  public getTotalCurrent(): number {
    return this.current_i;
  }

  /**
   * 推進一個時間步長
   * @param dt 時間步長 (ms)
   * @param t 當前模擬時間 (ms)
   * @param syn_input 突觸等效輸入電流 (pA)
   * @param ext_current 外部注入電流 (pA)
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

    this.current_i = syn_input + ext_current; // 記錄總推力
    const current_gL = this.resolveG(this.params.g_L, t, this.v);

    const i_leak = -current_gL * (this.v - this.params.V_L);
    const i_syn = syn_input;
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
