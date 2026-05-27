import type { LIFParams } from './LIFNeuron';
import { LIFNeuron } from './LIFNeuron';

/**
 * 計算放電變異係數 (Coefficient of Variation of Inter-Spike Intervals)
 * @param spikeTimes 脈衝時間點陣列 (ms)
 * @returns CV_ISI 值。若脈衝數小於 3 則傳回 0。
 */
export function calculateCV_ISI(spikeTimes: number[]): number {
  if (spikeTimes.length < 3) return 0;

  const isis: number[] = [];
  for (let i = 1; i < spikeTimes.length; i++) {
    isis.push(spikeTimes[i] - spikeTimes[i - 1]);
  }

  const mean = isis.reduce((a, b) => a + b, 0) / isis.length;
  if (mean === 0) return 0;

  const variance = isis.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / isis.length;
  const stdDev = Math.sqrt(variance);

  return stdDev / mean;
}

/**
 * 產生 F-I 曲線資料 (Firing Rate vs Injected Current)
 * @param NeuronClass 神經元類別 (需繼承自 LIFNeuron)
 * @param params 神經元基礎參數
 * @param iMax 最大掃描電流 (pA)
 * @param iStep 電流步長 (pA)
 * @param duration 每個取樣點的模擬時長 (ms)，預設 1000ms
 * @returns 包含電流與頻率的資料陣列
 */
export function generateFICurve<P extends LIFParams>(
  NeuronClass: new (params: P) => LIFNeuron,
  params: P,
  iMax: number = 800,
  iStep: number = 10,
  duration: number = 1000
): { current: number; freq: number }[] {
  const results: { current: number; freq: number }[] = [];
  const dt = 0.1; // 掃描時使用固定的高精度步長
  const steps = duration / dt;

  for (let i = 0; i <= iMax; i += iStep) {
    // 透過類別構造函數建立新的實例，確保每個採樣點都是獨立且重置過的
    const tempNeuron = new NeuronClass(params);
    let spikeCount = 0;

    for (let step = 0; step < steps; step++) {
      if (tempNeuron.step(dt, i)) {
        spikeCount++;
      }
    }

    // 計算 Hz (每秒放電次數)
    const freq = (spikeCount / duration) * 1000;
    results.push({ current: i, freq });
  }

  return results;
}
