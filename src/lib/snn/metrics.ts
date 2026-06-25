import { CubaSynapse } from './synapses';
import type { ISynapsePhysics, ISynapseDynamics } from './synapses';

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

import type { INetworkNode } from './network/core/INetworkNode';

/**
 * 產生 F-I 曲線 (頻率-電流響應曲線)
 * 模擬在不同持續性輸入強度下，神經元的放電頻率。
 *
 * @param NeuronClass 神經元類別 (需繼承或實作 INetworkNode)
 * @param params 神經元基礎參數
 * @param iMax 最大掃描強度 (CUBA: pA, COBA: nS)
 * @param iStep 強度步長
 * @param duration 每個取樣點的模擬時長 (ms)，預設 1000ms
 * @param decoratorFactory 物理轉換層裝飾器工廠，將穩態訊號 S 轉換為物理等效電流 I_syn
 * @returns 包含強度與頻率的資料陣列
 */
export function generateFICurve<P extends { V_L: number; C_m: number }>(
  NeuronClass: new (params: P) => INetworkNode,
  params: P,
  iMax: number = 800,
  iStep: number = 10,
  duration: number = 1000,
  decoratorFactory: (base: ISynapseDynamics) => ISynapsePhysics = (base) => new CubaSynapse(base)
): { current: number; freq: number }[] {
  const results: { current: number; freq: number }[] = [];
  const dt = 0.1;
  const steps = duration / dt;

  for (let i = 0; i <= iMax; i += iStep) {
    const tempNeuron = new NeuronClass(params);
    
    // 建立一個假的基礎突觸，永遠輸出恆定的穩態訊號強度 i (即 S)
    const dummyBase: ISynapseDynamics = {
      step: () => i,
      getSignalStrength: () => i,
      getMonitorData: () => ({ signalStrength: i }),
      reset: () => {}
    };
    
    // 透過工廠函數套用對應的物理轉換層裝飾器 (CUBA 或 COBA)
    const physicsSynapse = decoratorFactory(dummyBase);

    let spikeCount = 0;

    for (let step = 0; step < steps; step++) {
      const time = step * dt;
      // 透過物理裝飾器取得物理等效電流 I_syn
      const i_syn = physicsSynapse.getEquivalentCurrent(dt, false, tempNeuron.getVoltage());
      
      if (tempNeuron.step(dt, time, i_syn, 0)) {
        spikeCount++;
      }
    }

    const freq = (spikeCount / duration) * 1000;
    results.push({ current: i, freq });
  }

  return results;
}
