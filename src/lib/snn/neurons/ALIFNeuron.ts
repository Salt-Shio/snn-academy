import { LIFNeuron, type LIFParams } from './LIFNeuron';

export interface ALIFParams extends LIFParams {
  tau_w: number; // 適應性電流時間常數 (ms)
  b: number;     // 每次脈衝觸發的適應性電流增量 (pA)
}

/**
 * Adaptive Leaky Integrate-and-Fire (ALIF) 神經元模型。
 * 繼承自 LIFNeuron，增加了適應性電流 w，用於模擬放電頻率適應 (Spike-Frequency Adaptation)。
 */
export class ALIFNeuron extends LIFNeuron {
  protected w: number = 0; // 適應性電流 (pA)
  public alifParams: ALIFParams;

  constructor(params: ALIFParams) {
    super(params);
    this.alifParams = params;
  }

  public reset(): void {
    super.reset();
    this.w = 0;
  }

  /**
   * 獲取目前的適應性電流值
   */
  public getAdaptationCurrent(): number {
    return this.w;
  }

  public step(dt: number, t: number, syn_input: number, ext_current: number): boolean {
    // 1. 適應性電流指數衰減: dw/dt = -w / tau_w
    if (this.alifParams.tau_w > 0) {
      this.w -= (this.w / this.alifParams.tau_w) * dt;
    } else {
      this.w = 0;
    }

    // 2. 將適應性電流作為負反饋加入總電流中
    // 總電流 = i_leak + i_syn + i_ext - w
    // 我們可以將 (ext_current - w) 傳遞給父類的 step
    const effective_ext = ext_current - this.w;

    // 3. 呼叫基礎 LIF 積分邏輯
    const spiked = super.step(dt, t, syn_input, effective_ext);

    // 4. 若發生脈衝，增加適應性電流: w = w + b
    if (spiked) {
      this.w += this.alifParams.b;
    }

    return spiked;
  }
}
