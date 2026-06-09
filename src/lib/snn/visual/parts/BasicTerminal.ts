import type { IVisualTerminal, Point2D } from './interfaces';

export class BasicTerminal implements IVisualTerminal {
  public radius: number;

  constructor(radius: number = 5) {
    this.radius = radius;
  }

  public getOutputAnchor(cx: number, cy: number): Point2D {
    // 骨架階段，錨點即為小圓圓心
    return { x: cx, y: cy };
  }
}
