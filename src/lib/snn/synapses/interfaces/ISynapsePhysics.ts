import type { ISynapseDynamics } from './ISynapseDynamics';

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
   * 取得被裝飾的動態層實例。
   * 讓監控與視覺層能透過介面存取動態層，無需 as any 穿越。
   */
  getDynamics(): ISynapseDynamics;

  /**
   * 取得上一步的驅動力 (V - V_rev)。
   * 僅電導基礎 (COBA) 模型有意義，電流基礎 (CUBA) 不實作此方法。
   */
  getLastDrivingForce?(): number;

  /**
   * 重置物理層狀態（通常會連帶重置內部的動態層）
   */
  reset(): void;
}
