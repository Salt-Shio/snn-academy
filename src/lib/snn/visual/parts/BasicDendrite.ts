import type { IVisualDendrite, Point2D } from './interfaces';

export class BasicDendrite implements IVisualDendrite {
  public angle: number;
  public length: number;

  constructor(
    angle: number,
    length: number = 20
  ) {
    this.angle = angle;
    this.length = length;
  }

  public getInputAnchor(somaX: number, somaY: number, somaRadius: number): Point2D {
    // 綠線從大圓邊緣伸出
    const startX = somaX + somaRadius * Math.cos(this.angle);
    const startY = somaY + somaRadius * Math.sin(this.angle);
    
    // 綠線末端對接點
    return {
      x: startX + this.length * Math.cos(this.angle),
      y: startY + this.length * Math.sin(this.angle)
    };
  }
}
