import type { ISynapsePhysics } from '../../synapses/interfaces/ISynapsePhysics';
import type { ILearningRule } from '../../synapses/interfaces/ILearningRule';

/**
 * 突觸連線物件。
 * 定義了網路中從一個節點 (Source) 到另一個節點 (Target) 的連向關係及其物理屬性與學習規則。
 */
export class Connection {
  /** 突觸前節點 ID */
  public sourceId: string;
  /** 突觸後節點 ID */
  public targetId: string;
  
  /** 負責訊號傳遞與物理映射的實體 (例如 Cuba/Coba 裝飾器) */
  public transmission: ISynapsePhysics;

  /** 負責可塑性更新的學習機制 (選擇性存在) */
  public learningRule?: ILearningRule;

  /** 上一步計算的等效突觸電流 (pA)，供視覺層即時監控 */
  public lastISyn: number = 0;

  /** 上一步的驅動力 (V - V_rev)，僅 COBA 模式有意義 (mV) */
  public lastDrivingForce: number = 0;

  /**
   * @param sourceId 突觸前節點 ID
   * @param targetId 突觸後節點 ID
   * @param transmission 物理傳遞層實例
   * @param learningRule 學習機制實例 (可選)
   */
  constructor(
    sourceId: string, 
    targetId: string, 
    transmission: ISynapsePhysics,
    learningRule?: ILearningRule
  ) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.transmission = transmission;
    this.learningRule = learningRule;
  }
}
