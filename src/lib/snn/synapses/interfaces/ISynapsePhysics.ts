/**
 * 突觸物理映射介面。
 * 負責將抽象訊號轉換為最終流入神經元的等效物理電流。
 */
export interface ISynapsePhysics {
  /**
   * 獲取當前步長的等效突觸電流。
   * @param dt 時間步長 (ms)
   * @param preSpike 前級神經元是否發生脈衝
   * @param postVoltage 後級神經元的當前膜電位 (供 COBA 模式計算驅動力)
   * @returns number 物理電流 I_syn (pA)
   */
  getEquivalentCurrent(dt: number, preSpike: boolean, postVoltage: number): number;

  /**
   * 重置物理層狀態（通常會連帶重置內部的動態層）
   */
  reset(): void;
}
