/**
 * 突觸可塑性與學習規則介面。
 * 負責處理基於脈衝時序或狀態的權重更新。
 */
export interface ILearningRule {
  /**
   * 當後級神經元發射脈衝時觸發的回呼。
   * 用於實作 LTP 等需要後級反饋的學習邏輯。
   */
  onPostSpike(): void;
}
