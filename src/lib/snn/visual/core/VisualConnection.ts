import type { Point2D } from '../parts/interfaces';

/**
 * 單位 4: 突觸向外的連線 (黑斜線)
 * 負責連接 Source 的小圓到 Target 的綠線末端
 */
export class VisualConnection {
  public id: string;
  public sourceId: string;
  public targetId: string;
  
  // 記錄黑線的起始點與終點 (由 VisualNetwork 計算後注入)
  public startPoint: Point2D = { x: 0, y: 0 };
  public endPoint: Point2D = { x: 0, y: 0 };
  
  public hasPulse: boolean = false;

  // --- 突觸即時狀態 (由 VisualNetwork.syncStates 同步) ---
  /** 等效突觸電流 (pA) */
  public iSyn: number = 0;
  /** 訊號強度 S(t) (pA 或 nS) */
  public signalStrength: number = 0;
  /** COBA 驅動力 (V - V_rev) (mV) */
  public drivingForce: number = 0;
  /** STP 可用資源 R */
  public stpR: number = 1.0;
  /** STP 釋放機率 u */
  public stpU: number = 0;
  /** STDP 動態權重 */
  public stdpWeight: number = 0;
  /** STDP 前級跡線 P */
  public stdpP: number = 0;
  /** STDP 後級跡線 M */
  public stdpM: number = 0;

  constructor(sourceId: string, targetId: string) {
    this.id = `link-${sourceId}-${targetId}`;
    this.sourceId = sourceId;
    this.targetId = targetId;
  }

  /**
   * 取得連線中點座標 (供 SVG Label 定位)
   */
  public getMidPoint(): Point2D {
    return {
      x: (this.startPoint.x + this.endPoint.x) / 2,
      y: (this.startPoint.y + this.endPoint.y) / 2,
    };
  }
}

