import { BaseSynapse } from './BaseSynapse';
import type { ILearningRule } from '../interfaces/ILearningRule';
import type { SynapseMonitorData } from '../interfaces/ISynapseMonitorData';

/**
 * 具備脈衝時序依賴可塑性 (STDP) 的突觸動態類別。
 * 嚴格遵循 @basic-resource/STDP.ipynb 中的跡線模型實作。
 */
export class STDPSynapse extends BaseSynapse implements ILearningRule {
  // --- STDP 內部跡線 (Traces) ---
  private P: number = 0; // 突觸前跡線，隨 Pre-spike 增加 A+
  private M: number = 0; // 突觸後跡線，隨 Post-spike 減少 A-
  
  public currentWeight: number; // 動態權重 w

  // --- STDP 超參數 ---
  private A_plus: number;
  private A_minus: number;
  private tau_stdp: number;
  private w_max: number;

  constructor(
    initialWeight: number,
    tauSyn: number,
    A_plus: number = 0.008,
    A_minus: number = 0.0088,
    tau_stdp: number = 20,
    w_max: number = 0.024
  ) {
    super(initialWeight, tauSyn);
    this.currentWeight = initialWeight;
    this.A_plus = A_plus;
    this.A_minus = A_minus;
    this.tau_stdp = tau_stdp;
    this.w_max = w_max;
  }

  public reset(): void {
    super.reset();
    this.P = 0;
    this.M = 0;
    this.currentWeight = this.weight;
  }

  public getWeight(): number {
    return this.currentWeight;
  }

  /**
   * 實作 ISynapseDynamics: 正向時間推進與前級觸發
   */
  public step(dt: number, preSpike: boolean): number {
    // 1. 跡線指數衰減: dP/dt = -P/tau, dM/dt = -M/tau
    if (this.tau_stdp > 0) {
      this.P -= (this.P / this.tau_stdp) * dt;
      this.M -= (this.M / this.tau_stdp) * dt;
    }
    this.decay(dt);

    // 2. 當前級脈衝抵達 (Pre-spike)
    if (preSpike) {
      // (a) 根據筆記 Section 3.3 更新權重 (執行 LTD)
      // w = w + M(t) * w_max (注意此時 M 是負的或包含負向趨勢)
      this.currentWeight += this.M * this.w_max;
      this.currentWeight = Math.max(0, this.currentWeight);

      // (b) 根據筆記 Section 3.2 更新前級跡線 P
      // P = P + A+
      this.P += this.A_plus;
      
      // (c) 產生突觸訊號增量
      this.signalStrength += this.currentWeight;
    }

    return this.signalStrength;
  }

  /**
   * 實作 ILearningRule: 反向後級觸發
   */
  public onPostSpike(): void {
    // 1. 根據筆記 Section 3.3 更新權重 (執行 LTP)
    // w = w + P(t) * w_max
    this.currentWeight += this.P * this.w_max;
    this.currentWeight = Math.min(this.w_max, this.currentWeight);

    // 2. 根據筆記 Section 3.2 更新後級跡線 M
    // M = M - A-
    this.M -= this.A_minus;
  }

  /**
   * 取得前級跡線值 (用於視覺化監控)
   */
  public getPreTrace(): number {
    return this.P;
  }

  /**
   * 取得後級跡線值 (用於視覺化監控)
   */
  public getPostTrace(): number {
    return this.M;
  }

  public override getMonitorData(): SynapseMonitorData {
    return {
      ...super.getMonitorData(),
      stdpWeight: this.currentWeight,
      stdpPreTrace: this.P,
      stdpPostTrace: this.M,
    };
  }
}
