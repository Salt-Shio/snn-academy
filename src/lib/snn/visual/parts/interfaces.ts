/**
 * 基礎 2D 座標點介面
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 單位 1: 細胞本體 (Soma) 介面
 */
export interface IVisualSoma {
  radius: number;
  getSurfacePoint(cx: number, cy: number, angle: number): Point2D;
}

/**
 * 單位 2: 軸突主幹 (Axon) 介面
 */
export interface IVisualAxon {
  length: number;
}

/**
 * 單位 3: 突觸末端 (Terminal) 介面
 */
export interface IVisualTerminal {
  radius: number;
  // 提供給突觸連線 (黑線) 的對接起點
  getOutputAnchor(cx: number, cy: number): Point2D;
}

/**
 * 單位 5: 樹突輸入 (Dendrite) 介面
 */
export interface IVisualDendrite {
  angle: number; // 伸出的角度
  length: number; // 綠線長度
  // 提供給突觸連線 (黑線) 的對接終點
  getInputAnchor(somaX: number, somaY: number, somaRadius: number): Point2D;
}

/**
 * 視覺化配置參數
 */
export interface VisualNeuronConfig {
  somaRadius: number;
  axonLength: number;
  terminalRadius: number;
  dendriteLength: number;
}
