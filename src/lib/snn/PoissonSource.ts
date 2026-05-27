/**
 * 泊松脈衝源 (Poisson Spike Source)
 * 根據給定的放電頻率 (Rate) 隨機產生脈衝。
 */
export class PoissonSource {
  public hasSpiked: boolean = false;

  constructor(public rate: number = 20) {} // 預設放電率為 20 Hz

  /**
   * 推進一個時間步長
   * @param dt 時間步長 (ms)
   * @returns boolean 該步長是否發生隨機脈衝
   */
  public step(dt: number): boolean {
    this.hasSpiked = false;

    // 將 Hz 換算成該時間步長內的發射機率 P
    // Rate (次/秒) * (dt / 1000 秒) = 該 dt 內預期的發射次數
    const probability = this.rate * (dt / 1000);

    // 擲骰子
    if (Math.random() < probability) {
      this.hasSpiked = true;
      return true;
    }

    return false;
  }
}
