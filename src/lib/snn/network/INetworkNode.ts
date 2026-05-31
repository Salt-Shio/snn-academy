/**
 * 神經網路節點介面。
 * 統一了不同類型的節點（如真實神經元、純脈衝產生器）在網路中的通訊協議。
 */
export interface INetworkNode {
  /**
   * 上一個時間步長是否發射了脈衝。
   * 用於突觸路由 (Routing) 判定。
   */
  hasSpiked: boolean;

  /**
   * 取得當前節點電壓 (mV)。
   * COBA 突觸需要此資訊來計算驅動力。
   */
  getVoltage(): number;

  /**
   * 取得節點在最後一次步長中所承受的總物理電流 (pA)。
   * 包含突觸輸入與外部注入。用於視覺化監聽。
   */
  getTotalCurrent(): number;

  /**
   * 推進一個時間步長。
   * @param dt 時間步長 (ms)
   * @param time 當前模擬時間 (ms)
   * @param syn_input 累加後的突觸輸入電流 (pA)
   * @param ext_current 外部注入電流 (pA)
   * @returns 該步長是否發射了脈衝
   */
  step(dt: number, time: number, syn_input: number, ext_current: number): boolean;

  /**
   * 重置節點狀態。
   */
  reset(): void;
}
