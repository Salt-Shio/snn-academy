import type { IVisualSoma, IVisualAxon, IVisualTerminal, IVisualDendrite, Point2D } from '../parts/interfaces';
import type { VisualConnection } from './VisualConnection';

export class VisualNeuron {
  public id: string;
  public cx: number;
  public cy: number;
  public isSpiking: boolean = false;
  public voltage: number = -75;
  public totalCurrent: number = 0;

  // 5 個單位的核心組成
  public soma: IVisualSoma;                 // 單位 1: 大圓
  public axon: IVisualAxon;                 // 單位 2: 紅直線
  public terminal: IVisualTerminal;         // 單位 3: 小圓
  public outgoingConnections: VisualConnection[] = []; // 單位 4: 黑線
  public dendrites: IVisualDendrite[] = []; // 單位 5: 綠線

  constructor(
    id: string,
    cx: number,
    cy: number,
    parts: { soma: IVisualSoma; axon: IVisualAxon; terminal: IVisualTerminal }
  ) {
    this.id = id;
    this.cx = cx;
    this.cy = cy;
    this.soma = parts.soma;
    this.axon = parts.axon;
    this.terminal = parts.terminal;
  }

  /**
   * 取得單位 3 (小圓) 的中心絕對座標
   */
  public getTerminalPosition(): Point2D {
    return {
      x: this.cx + this.axon.length,
      y: this.cy
    };
  }

  /**
   * 單位 2: 取得紅線的起點與終點 (Soma 中心到 Terminal 中心)
   */
  public getAxonLine(): { start: Point2D; end: Point2D } {
    return {
      start: { x: this.cx, y: this.cy },
      end: this.getTerminalPosition()
    };
  }

  /**
   * 新增一條向外的黑線 (單位 4)
   */
  public addOutgoingConnection(conn: VisualConnection): void {
    this.outgoingConnections.push(conn);
  }

  /**
   * 新增一條向內的綠線 (單位 5)
   */
  public addDendrite(dendrite: IVisualDendrite): void {
    this.dendrites.push(dendrite);
  }
}
