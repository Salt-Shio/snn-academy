/**
 * 突觸動態層的監控快照型別。
 * 各動態實作透過此型別暴露其可觀測狀態，
 * 讓監控層與視覺層不需 instanceof 即可存取所需資訊。
 */
export interface SynapseMonitorData {
  /** 當前訊號強度 S(t) (所有動態類別皆提供) */
  signalStrength: number;

  // --- STP 專屬 (僅 STPSynapse 回傳) ---
  /** 可用資源比例 R */
  stpR?: number;
  /** 釋放機率 u */
  stpU?: number;

  // --- STDP 專屬 (僅 STDPSynapse 回傳) ---
  /** 動態權重 w */
  stdpWeight?: number;
  /** 前級跡線 P */
  stdpPreTrace?: number;
  /** 後級跡線 M */
  stdpPostTrace?: number;
}
