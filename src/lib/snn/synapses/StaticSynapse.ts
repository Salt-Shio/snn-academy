import { BaseSynapse } from './BaseSynapse';

/**
 * 靜態指數衰減突觸。
 * 每次脈衝固定增加指定權重，沒有資源耗盡的概念。
 */
export class StaticSynapse extends BaseSynapse {
  /**
   * @param dt 時間步長
   * @param preSpike 前級脈衝
   */
  public step(dt: number, preSpike: boolean): number {
    // 1. 指數衰減
    this.decay(dt);

    // 2. 脈衝觸發
    if (preSpike) {
      this.signalStrength += this.weight;
    }

    return this.signalStrength;
  }
}
