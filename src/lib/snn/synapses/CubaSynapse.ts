import type { ISynapse } from './ISynapse';

/**
 * CUBA (電流基礎) 突觸裝飾器 (Decorator)。
 * 它將任何實作了 ISynapse 的基礎突觸 (如 StaticSynapse, STPSynapse) 包裝起來。
 * 在 CUBA 模型中，轉換邏輯為恆等函數：I_syn = S(t)。
 */
export class CubaSynapse implements ISynapse {
  private baseSynapse: ISynapse;

  /**
   * @param baseSynapse 被包裝的基礎突觸 (產出抽象訊號/電流)
   */
  constructor(baseSynapse: ISynapse) {
    this.baseSynapse = baseSynapse;
  }

  /**
   * @param dt 時間步長
   * @param preSpike 前級脈衝
   * @param postVoltage 後級電壓 (CUBA 雖然不需要此參數，但為了符合介面仍保留)
   */
  public step(dt: number, preSpike: boolean, _postVoltage?: number): number {
    // 1. 從基礎突觸獲取訊號強度 S(t)
    const s = this.baseSynapse.step(dt, preSpike);

    // 2. CUBA 模型：直接將 S(t) 視為等效電流 I_syn (pA)
    return s;
  }

  public reset(): void {
    this.baseSynapse.reset();
  }
}
