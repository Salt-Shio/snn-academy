import type { ISynapsePhysics } from '../interfaces/ISynapsePhysics';
import type { ISynapseDynamics } from '../interfaces/ISynapseDynamics';

/**
 * CUBA (電流基礎) 突觸物理裝飾器。
 * 將抽象訊號 S(t) 直接映射為物理電流 I_syn = S(t)。
 */
export class CubaSynapse implements ISynapsePhysics {
  public dynamics: ISynapseDynamics;

  /**
   * @param dynamics 被包裝的動態層實體
   */
  constructor(dynamics: ISynapseDynamics) {
    this.dynamics = dynamics;
  }

  /**
   * CUBA 模型：直接將 S(t) 視為等效電流 I_syn (pA)
   */
  public getEquivalentCurrent(dt: number, preSpike: boolean, _postVoltage: number): number {
    const s = this.dynamics.step(dt, preSpike);
    return s;
  }

  public reset(): void {
    this.dynamics.reset();
  }
}
