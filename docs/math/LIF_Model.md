# 基礎 Leaky Integrate-and-Fire (LIF) 模型

LIF 模型是描述神經元膜電位演化的最簡基礎模型。它將神經元簡化為一個由電阻（漏電）與電容（整合）並聯組成的電路。

## 1. 膜電位微分方程 (Continuous Form)

膜電位 $V$ 隨時間 $t$ 的變化遵循以下線性微分方程：

$$\tau_m \frac{dV(t)}{dt} = -(V(t) - V_L) + \frac{I_{inj}(t)}{g_L}$$

其中：
- $V(t)$: 膜電位 (Membrane Potential, mV)。
- $\tau_m$: 膜時間常數 (Membrane Time Constant, ms)，定義為 $\tau_m = R_m \cdot C_m$。
- $V_L$: 漏電反轉電位 (Leak Reversal Potential, mV)，通常也是神經元的靜息電位。
- $I_{inj}(t)$: 外部注入電流 (Injected Current, pA)。
- $g_L$: 漏電導 (Leak Conductance, nS)，即電阻的倒數 $1/R_m$。

## 2. 數值積分：尤拉方法 (Euler Method)

在程式實作中，我們將時間離散化，使用步長 $\Delta t$ 來近似電位變化：

$$V_{t+\Delta t} = V_t + \frac{\Delta t}{\tau_m} \left( -(V_t - V_L) + \frac{I_{inj}}{g_L} \right)$$

## 3. 發射與重置邏輯 (Spike & Reset)

當膜電位達到閾值 $V_{th}$ 時，神經元發射脈衝並進入不應期：

1. **Fire**: 如果 $V_t \ge V_{th}$，則發射 Spike。
2. **Reset**: 將電位重置為 $V_{reset}$（通常 $V_{reset} \le V_L$）。
3. **Refractory Period**: 在接下來的 $t_{ref}$ 時間內，膜電壓被鎖定在 $V_{reset}$，不再累積輸入。

## 4. 輸入模式算法 (Input Modes)

在沙盒實作中，我們支援兩種將外部輸入轉化為 $I_{inj}$ 的方式：

### A. 常數電流模式 (Constant Current)
這是最直觀的輸入方式。在特定的時間區間 $[t_{start}, t_{end}]$ 內，給予恆定的電流值：

$$I_{inj}(t) = \begin{cases} I_{base}, & \text{if } t \in [t_{start}, t_{end}] \\ 0, & \text{otherwise} \end{cases}$$

這會導致膜電位以指數方式漸近趨向平衡點 $V_{steady} = V_L + \frac{I_{base}}{g_L}$。

### B. 泊松脈衝輸入 (Poisson Spikes)
在泊松模式下，輸入是一系列離散的脈衝事件。我們可以透過對原始微分方程進行尤拉離散化來觀察其影響：

1. **尤拉離散化**: 將微分方程轉化為離散形式：
   $$V_{t+\Delta t} = V_t + \frac{\Delta t}{\tau_m} \left( -(V_t - V_L) + \frac{I_{inj}}{g_L} \right)$$
3. **脈衝等效**: 在泊松模式中，會用一個 $w$　來表示脈衝的觸發強度，（也就是神經網路的常見的權重），$I_{inj} = \frac{w}{\Delta_t}$。
4. **推導電位跳躍**: 將脈衝等效電流代入「輸入項」：
   $$\Delta V_{spike} = \frac{\Delta t}{\tau_m} \cdot \frac{w / \Delta t}{g_L} = \frac{w}{\tau_m \cdot g_L} = \frac{w}{C_m}$$
   *(註：利用關係式 $\tau_m = R_m C_m$ 及 $g_L = 1/R_m$，可得 $\tau_m g_L = C_m$)*
5. **結論**: 在程式實作中，當泊松源觸發時，電位會產生 $\Delta V = \frac{w}{C_m}$ 的跳躍。




## 5. 程式碼對照 (`LIFNeuron.ts`)

```typescript
// 核心更新邏輯
const dv = (-(this.v - this.params.V_L) + (I_inj / this.params.g_L)) / this.params.tau_m * dt;
this.v += dv;
```
