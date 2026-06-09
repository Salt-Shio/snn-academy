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

  constructor(sourceId: string, targetId: string) {
    this.id = `link-${sourceId}-${targetId}`;
    this.sourceId = sourceId;
    this.targetId = targetId;
  }
}
