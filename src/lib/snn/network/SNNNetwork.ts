import type { INetworkNode } from './INetworkNode';
import type { Connection } from './Connection';

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
    this.connections.forEach(conn => conn.synapse.reset());
    this.nodes.forEach((_, id) => this.inputBuffer.set(id, 0));
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

    // 2. 路由訊號 (Routing)
    // 遍歷所有連線，將 Pre-spike 傳遞給突觸，並累加物理電流至 Target 的緩衝區
    for (const conn of this.connections) {
      const source = this.nodes.get(conn.sourceId);
      const target = this.nodes.get(conn.targetId);

      if (!source || !target) continue;

      // 取得 Source 上一步長是否發火
      const preSpike = source.hasSpiked;
      
      // 取得 Target 當前電壓（供 COBA 計算驅動力）
      const targetVoltage = target.getVoltage();

      // 計算突觸輸出的等效電流 I_syn
      const i_syn = conn.synapse.step(dt, preSpike, targetVoltage);

      // 將電流累加進 Target 的緩衝區
      const currentVal = this.inputBuffer.get(conn.targetId) || 0;
      this.inputBuffer.set(conn.targetId, currentVal + i_syn);
    }

    // 3. 狀態更新 (Update)
    // 遍歷所有節點，讓它們吃下累加好的 Buffer 與外部注入電流進行積分
    this.nodes.forEach((node, id) => {
      const synInput = this.inputBuffer.get(id) || 0;
      const extInput = extCurrents.get(id) || 0;
      node.step(dt, time, synInput, extInput);
    });

    // 4. 廣播事件
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
}
