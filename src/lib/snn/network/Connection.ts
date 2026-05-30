import type { ISynapse } from '../synapses/ISynapse';

/**
 * 突觸連線物件。
 * 定義了網路中從一個節點 (Source) 到另一個節點 (Target) 的連向關係及其物理屬性。
 */
export class Connection {
  /** 突觸前節點 ID */
  public sourceId: string;
  /** 突觸後節點 ID */
  public targetId: string;
  /** 該連線套用的突觸實例（包含動態與物理裝飾器） */
  public synapse: ISynapse;

  /**
   * @param sourceId 突觸前節點 ID
   * @param targetId 突觸後節點 ID
   * @param synapse 突觸實例
   */
  constructor(sourceId: string, targetId: string, synapse: ISynapse) {
    this.sourceId = sourceId;
    this.targetId = targetId;
    this.synapse = synapse;
  }
}
