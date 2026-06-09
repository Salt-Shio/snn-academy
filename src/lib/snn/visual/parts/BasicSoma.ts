import type { IVisualSoma, Point2D } from './interfaces';

export class BasicSoma implements IVisualSoma {
  public radius: number;

  constructor(radius: number = 20) {
    this.radius = radius;
  }

  public getSurfacePoint(cx: number, cy: number, angle: number): Point2D {
    return {
      x: cx + this.radius * Math.cos(angle),
      y: cy + this.radius * Math.sin(angle)
    };
  }
}
