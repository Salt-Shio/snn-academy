import type { ISynapsePhysics } from '../interfaces/ISynapsePhysics';
import type { ISynapseDynamics } from '../interfaces/ISynapseDynamics';

/**
 * COBA (電導基礎) 突觸物理裝飾器。
 * 將抽象訊號 S(t) 視為電導 (nS)，並根據歐姆定律轉換為物理電流 I_syn = -S * (V - V_rev)。
 */
export class CobaSynapse implements ISynapsePhysics {
  public dynamics: ISynapseDynamics;
  public vRev: number;

  /**
   * @param dynamics 被包裝的動態層實體 (產出電導)
   * @param vRev 反轉電位 (mV)
   */
  constructor(dynamics: ISynapseDynamics, vRev: number) {
    this.dynamics = dynamics;
    this.vRev = vRev;
  }

  /**
   * 套用歐姆定律計算等效物理電流
   */
  public getEquivalentCurrent(dt: number, preSpike: boolean, postVoltage: number): number {
    // 1. 從動態層獲取電導強度 S(t)
    const g = this.dynamics.step(dt, preSpike);

    // 2. 套用歐姆定律: I = -g * (V - V_rev)
    return -g * (postVoltage - this.vRev);
  }

  public reset(): void {
    this.dynamics.reset();
  }
}
