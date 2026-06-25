// Synapse interfaces
export type { ISynapseDynamics } from './interfaces/ISynapseDynamics';
export type { ISynapsePhysics } from './interfaces/ISynapsePhysics';
export type { ILearningRule } from './interfaces/ILearningRule';
export type { SynapseMonitorData } from './interfaces/ISynapseMonitorData';

// Dynamics
export { BaseSynapse } from './dynamics/BaseSynapse';
export { StaticSynapse } from './dynamics/StaticSynapse';
export { STPSynapse } from './dynamics/STPSynapse';
export { STDPSynapse } from './dynamics/STDPSynapse';

// Physics
export { CubaSynapse } from './physics/CubaSynapse';
export { CobaSynapse } from './physics/CobaSynapse';
