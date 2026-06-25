import type { INetworkNode } from './INetworkNode';
import type { Connection } from './Connection';
import type { ISynapsePhysics } from '../../synapses/interfaces/ISynapsePhysics';
import { CobaSynapse } from '../../synapses/physics/CobaSynapse';

export type StepCallback = (time: number, network: SNNNetwork) => void;

/**
 * 神經網路管理器。
 * 負責協調所有節點與連線的生命週期，執行全局的時間推進與訊號路由。
 */
export class SNNNetwork {
  private nodes: Map<string, INetworkNode> = new Map();
  private connections: Connection[] = [];
  private inputBuffer: Map<string, number> = new Map();
  private stepListeners: StepCallback[] = [];

  /**
   * 註冊一個節點到網路中。
   */
  public addNode(id: string, node: INetworkNode): void {
    this.nodes.set(id, node);
    this.inputBuffer.set(id, 0);
  }

  /**
   * 註冊步長監聽器。
   */
  public addStepListener(callback: StepCallback): void {
    this.stepListeners.push(callback);
  }

  /**
   * 建立一條突觸連線。
   */
  public addConnection(connection: Connection): void {
    this.connections.push(connection);
  }

  /**
   * 取得指定節點。
   */
  public getNode(id: string): INetworkNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * 重置整個網路的狀態。
   */
  public reset(): void {
    this.nodes.forEach(node => node.reset());
    this.connections.forEach(conn => {
      conn.transmission.reset();
      // 注意：learningRule 可能與 transmission 共用同一個實體 (如 STDPSynapse)，所以可能已被 reset 過
      // 這裡做個簡單判斷或重複 reset 亦可
      if (conn.learningRule && (conn.learningRule as any) !== (conn.transmission as any)) {
        (conn.learningRule as any).reset?.();
      }
    });
    this.nodes.forEach((_, id) => this.inputBuffer.set(id, 0));
  }

  /**
   * 獲取指定連線的物理突觸實例。
   */
  public getSynapse(sourceId: string, targetId: string): ISynapsePhysics | undefined {
    const conn = this.connections.find(c => c.sourceId === sourceId && c.targetId === targetId);
    return conn?.transmission;
  }

  /**
   * 推進一個時間步長。
   * @param dt 時間步長 (ms)
   * @param time 當前模擬時間 (ms)
   * @param extCurrents 外部向指定節點注入的電流 Map (節點 ID -> 電流 pA)
   */
  public step(dt: number, time: number, extCurrents: Map<string, number> = new Map()): void {
    // 1. 初始化本步長的輸入緩衝區（歸零）
    this.nodes.forEach((_, id) => {
      this.inputBuffer.set(id, 0);
    });

    // 2. 正向路由 (Forward Routing: Physics & Dynamics)
    for (const conn of this.connections) {
      const source = this.nodes.get(conn.sourceId);
      const target = this.nodes.get(conn.targetId);

      if (!source || !target) continue;

      const postV = target.getVoltage();

      // 透過物理層取得轉換後的等效電流 I_syn
      // 這裡物理層內部會呼叫動態層進行時間推進
      const i_syn = conn.transmission.getEquivalentCurrent(dt, source.hasSpiked, postV);

      // 紀錄即時突觸資訊供視覺層同步
      conn.lastISyn = i_syn;
      if (conn.transmission instanceof CobaSynapse) {
        conn.lastDrivingForce = postV - conn.transmission.vRev;
      }

      // 將電流累加進 Target 的緩衝區
      const currentVal = this.inputBuffer.get(conn.targetId) || 0;
      this.inputBuffer.set(conn.targetId, currentVal + i_syn);
    }

    // 3. 狀態更新 (Neuron Update / Integration)
    this.nodes.forEach((node, id) => {
      const synInput = this.inputBuffer.get(id) || 0;
      const extInput = extCurrents.get(id) || 0;
      node.step(dt, time, synInput, extInput);
    });

    // 4. 反向路由 (Backward Routing: Learning Rules)
    for (const conn of this.connections) {
      const target = this.nodes.get(conn.targetId);
      if (target && target.hasSpiked && conn.learningRule) {
        conn.learningRule.onPostSpike();
      }
    }

    // 5. 廣播事件 (Monitoring)
    for (const listener of this.stepListeners) {
      listener(time, this);
    }
  }

  /**
   * 獲取所有發射脈衝的節點 ID 與時間點的 Snapshot。
   * 用於繪圖與分析。
   */
  public getSpikes(): string[] {
    const firedIds: string[] = [];
    this.nodes.forEach((node, id) => {
      if (node.hasSpiked) firedIds.push(id);
    });
    return firedIds;
  }

  /**
   * 獲取所有連線列表（供視覺層同步使用）。
   */
  public getConnections(): Connection[] {
    return this.connections;
  }

  /**
   * 獲取指定來源與目標之間的連線。
   */
  public getConnectionsBetween(sourceId: string, targetId: string): Connection | undefined {
    return this.connections.find(c => c.sourceId === sourceId && c.targetId === targetId);
  }
}
