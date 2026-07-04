import type { INetworkNode } from './core/INetworkNode';
import { SpikeGeneratorNode } from './core/SpikeGeneratorNode';
import type { ISynapsePhysics, ISynapseDynamics, ILearningRule } from '../synapses';
import { LIFNeuron, type LIFParams, ALIFNeuron, type ALIFParams } from '../neurons';
import { StaticSynapse, STPSynapse, STDPSynapse, CubaSynapse, CobaSynapse } from '../synapses';

// ─── 配置型別 ───

export type NeuronType = 'lif' | 'alif';
export type PhysicsModel = 'cuba' | 'coba';
export type SynapseType = 'static' | 'stp' | 'stdp';

export interface NeuronFactoryConfig {
  type: NeuronType;
  V_th: number;
  V_reset: number;
  V_L: number;
  g_L: number;
  C_m: number;
  tref: number;
  // ALIF 專屬
  tau_w?: number;
  b?: number;
}

export interface SynapseFactoryConfig {
  dynamicsType: SynapseType;
  physicsModel: PhysicsModel;
  weight: number;
  tauSyn: number;
  // STP 專屬
  stp?: { U0: number; tau_d: number; tau_f: number };
  // STDP 專屬
  stdp?: { A_plus: number; A_minus: number; tau_stdp: number };
  // COBA 專屬
  cobaVE?: number;
}

// ─── 工廠函式 ───

/**
 * 根據配置建立神經元實例。
 * 統一了 BasicLIFSandbox 和 TopologyView 中的重複建立邏輯。
 */
export function createNeuron(config: NeuronFactoryConfig): INetworkNode {
  const baseParams: LIFParams = {
    V_th: config.V_th,
    V_reset: config.V_reset,
    V_L: config.V_L,
    g_L: config.g_L,
    C_m: config.C_m,
    tref: config.tref,
  };

  if (config.type === 'alif') {
    const alifParams: ALIFParams = {
      ...baseParams,
      tau_w: config.tau_w ?? 100,
      b: config.b ?? 20,
    };
    return new ALIFNeuron(alifParams);
  }

  return new LIFNeuron(baseParams);
}

/**
 * 根據配置建立完整的突觸傳遞鏈（動態層 → 物理裝飾器）。
 * 統一了 BasicLIFSandbox 和 TopologyView 中的重複組裝邏輯。
 * @returns transmission (物理層) 和可選的 learningRule (學習層)
 */
export function createSynapseChain(config: SynapseFactoryConfig): {
  transmission: ISynapsePhysics;
  learningRule?: ILearningRule;
} {
  let dynamics: ISynapseDynamics;
  let learningRule: ILearningRule | undefined = undefined;

  // 1. 建立動態層
  if (config.dynamicsType === 'static') {
    dynamics = new StaticSynapse(config.weight, config.tauSyn);
  } else if (config.dynamicsType === 'stp') {
    const stp = config.stp ?? { U0: 0.5, tau_d: 100, tau_f: 50 };
    dynamics = new STPSynapse(config.weight, config.tauSyn, stp.U0, stp.tau_d, stp.tau_f);
  } else {
    const stdp = config.stdp ?? { A_plus: 0.008, A_minus: 0.0088, tau_stdp: 20 };
    const w_max = config.weight * 2;
    const stdpSynapse = new STDPSynapse(
      config.weight,
      config.tauSyn,
      stdp.A_plus,
      stdp.A_minus,
      stdp.tau_stdp,
      w_max
    );
    dynamics = stdpSynapse;
    learningRule = stdpSynapse;
  }

  // 2. 套用物理轉換層裝飾器
  const transmission = createPhysicsDecorator(dynamics, config.physicsModel, config.cobaVE);

  return { transmission, learningRule };
}

/**
 * 建立脈衝產生器節點 (訊號源)
 */
export function createSourceNode(rate: number): SpikeGeneratorNode {
  return new SpikeGeneratorNode(rate);
}

/**
 * 套用突觸物理層裝飾器，將動態層的訊號 S(t) 轉換為物理電流 I_syn
 */
export function createPhysicsDecorator(
  base: ISynapseDynamics,
  model: PhysicsModel,
  cobaVE?: number
): ISynapsePhysics {
  return model === 'coba'
    ? new CobaSynapse(base, cobaVE ?? 0)
    : new CubaSynapse(base);
}
