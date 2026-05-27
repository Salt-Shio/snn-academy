# 高斯白雜訊源 (Gaussian White Noise Source)

高斯白雜訊 (GWN) 常在神經科學模擬中用於代表背景突觸活動的隨機波動。

## 1. 數學模型：Euler-Maruyama 積分

在帶有噪音的 LIF 模型中，膜電位的變化由隨機微分方程 (SDE) 描述：

$$dv = \frac{-(v - V_L) + I_{inj}/g_L}{\tau_m} dt + \sigma \sqrt{\frac{dt}{\tau_m}} \xi$$

其中 $\xi$ 是遵循標準常態分佈 $N(0, 1)$ 的隨機變數。

## 2. 等效電流換算

為了保持 `LIFNeuron` 類別的純粹性，我們將雜訊項轉換為等效的輸入電流 $I_{noise}$：

1. **雜訊造成的電位變化**: $\Delta V_{noise} = \sigma \sqrt{\frac{\Delta t}{\tau_m}} N(0,1)$
2. **對應的注入電流**: 利用 LIF 的基礎電位更新公式 $\Delta V = \frac{I \cdot \Delta t}{\tau_m \cdot g_L}$
3. **推導結果**:
   $$\sigma \sqrt{\frac{\Delta t}{\tau_m}} N(0,1) = \frac{I_{noise} \cdot \Delta t}{\tau_m \cdot g_L}$$
   $$I_{noise} = \sigma \cdot g_L \cdot \sqrt{\frac{\tau_m}{\Delta t}} \cdot N(0, 1)$$

## 3. 程式碼實作 (`GWNSource.ts`)

我們使用 Box-Muller 轉換來產生 $N(0, 1)$ 樣本，並計算等效電流：

```typescript
public static getNoiseCurrent(sigma: number, tau_m: number, g_L: number, dt: number): number {
  if (sigma <= 0) return 0;
  const n01 = this.next(); // 產生 N(0, 1)
  return sigma * g_L * Math.sqrt(tau_m / dt) * n01;
}
```

## 4. 特性

- **$\sigma$ (Sigma)**: 控制波動的振幅。當 $\sigma$ 增加時，膜電位會變得更加顛簸。
- **誘發放電**: 即使平均電流低於閾值，隨機的雜訊波動仍可能將電位推向閾值，產生隨機放電。
