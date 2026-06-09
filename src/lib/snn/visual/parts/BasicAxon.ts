import type { IVisualAxon } from './interfaces';

export class BasicAxon implements IVisualAxon {
  public length: number;

  constructor(length: number = 100) {
    this.length = length;
  }
}
