/**
 * 突觸時間動態介面。
 * 負責計算抽象訊號強度 S(t) 的衰減與增量。
 * 這一層不關心物理單位（是 pA 還是 nS）。
 */
export interface ISynapseDynamics {
  /**
   * 推進一個步長的時間動態。
   * @param dt 時間步長 (ms)
   * @param preSpike 前級神經元是否發生脈衝
   * @returns number 當前的抽象訊號強度 S(t)
   */
  step(dt: number, preSpike: boolean): number;

  /**
   * 重置內部動態變數
   */
  reset(): void;
}
