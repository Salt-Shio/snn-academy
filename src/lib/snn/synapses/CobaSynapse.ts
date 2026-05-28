import type { ISynapse } from './ISynapse';

/**
 * COBA (電導基礎) 突觸裝飾器 (Decorator)。
 * 它將任何實作了 ISynapse 的基礎突觸 (如 StaticSynapse, STPSynapse) 包裝起來，
 * 將其輸出的「電導 (nS)」強度，依據歐姆定律轉換為「等效電流 (pA)」。
 */
export class CobaSynapse implements ISynapse {
  private baseSynapse: ISynapse;
  public vRev: number;

  /**
   * @param baseSynapse 被包裝的基礎突觸 (產出電導)
   * @param vRev 反轉電位 (mV)
   */
  constructor(baseSynapse: ISynapse, vRev: number) {
    this.baseSynapse = baseSynapse;
    this.vRev = vRev;
  }

  /**
   * @param dt 時間步長
   * @param preSpike 前級脈衝
   * @param postVoltage 後級電壓 (COBA 必須提供此參數來計算驅動力)
   */
  public step(dt: number, preSpike: boolean, postVoltage?: number): number {
    if (postVoltage === undefined) {
      throw new Error('CobaSynapse requires postVoltage to compute current.');
    }

    // 1. 從基礎突觸獲取電導強度 (nS)
    const g = this.baseSynapse.step(dt, preSpike);

    // 2. 套用歐姆定律: I = -g * (V - V_rev)
    return -g * (postVoltage - this.vRev);
  }

  public reset(): void {
    this.baseSynapse.reset();
  }
}
