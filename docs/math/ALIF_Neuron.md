# 適應性 Leaky Integrate-and-Fire (ALIF) 神經元

ALIF 模型是對基礎 LIF 模型的重要生理擴充。它引入了「放電頻率適應 (Spike-Frequency Adaptation, SFA)」機制，模擬神經元在持續受刺激時放電速度逐漸變慢的現象。

## 1. 核心數學模型

ALIF 在 LIF 的電壓積分方程基礎上，增加了一個適應性電流變數 $w(t)$。

### A. 膜電位微分方程
適應性電流 $w(t)$ 作為一個負反饋項，減少了有效的總輸入電流：

$$C_m \frac{dV(t)}{dt} = -g_L(V(t) - V_L) \mathbf{- w(t)} + I_{syn}(t) + I_{ext}(t)$$

### B. 適應性電流動態 (Temporal Dynamics)
$w(t)$ 遵循以下規律：
1.  **指數衰減**：在沒有脈衝時，以時間常數 $\tau_w$ 衰減回 0。
    $$\frac{dw}{dt} = -\frac{w}{\tau_w}$$
2.  **脈衝觸發增量 (Spike-triggered adaptation)**：當神經元發射脈衝 ($V \ge V_{th}$) 時，$w$ 瞬間增加一個固定量 $b$。
    $$w \leftarrow w + b$$

---

## 2. 生理意義：頻率適應 (SFA)

在生物學中，這種適應性通常由細胞內鈣離子（$Ca^{2+}$）累積所活化的鉀離子通道（如 K-AHP 通道）產生。
*   **「踩煞車」效應**：每發射一個脈衝，神經元就會「疲勞」一點點（$w$ 增加），導致下一個脈衝需要更強或更久的刺激才能觸發。
*   **資訊編碼**：這使得神經元對「刺激的變化」更敏感，而對「持續不變的刺激」產生習慣化（Habituation）。

---

## 3. 程式碼實作：物件導向繼承 (`ALIFNeuron.ts`)

我們透過繼承 `LIFNeuron` 來實現 ALIF，這保證了核心積分邏輯的複用性。

```typescript
// ALIFNeuron.ts 中的核心步驟
public step(dt: number, t: number, syn_input: number, ext_current: number): boolean {
  // 1. 適應性電流衰減
  this.w -= (this.w / this.params.tau_w) * dt;

  // 2. 扣除適應性電流後的有效輸入
  const effective_ext = ext_current - this.w;

  // 3. 執行標準 LIF 積分 (super.step)
  const spiked = super.step(dt, t, syn_input, effective_ext);

  // 4. 若發射，增加適應性電流 (踩煞車)
  if (spiked) {
    this.w += this.params.b;
  }
  return spiked;
}
```

## 4. 對 F-I 曲線的影響

在 F-I 曲線中，ALIF 會導致：
1.  **閾值右移**：需要更大的電流才能維持放電。
2.  **增益降低**：曲線的斜率變緩。這在生理上是一種保護機制，防止神經元因為過度興奮而受損。
