/**
 * 神經元與突觸之間的通用通訊契約。
 */
export interface ISynapse {
  /**
   * 推進一個時間步長
   * @param dt 時間步長 (ms)
   * @param preSpike 前級神經元是否發生脈衝
   * @param postVoltage 後級神經元的當前膜電位 (預留給 NMDA 等電壓相依通道)
   * @returns number 當前的突觸訊號強度 (CUBA 為 pA, COBA 為 nS)
   */
  step(dt: number, preSpike: boolean, postVoltage?: number): number;

  /**
   * 重置突觸內部狀態
   */
  reset(): void;
}
