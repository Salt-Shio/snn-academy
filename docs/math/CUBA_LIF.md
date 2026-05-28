# 電流基礎 Leaky Integrate-and-Fire (CUBA LIF) 模型

CUBA 模型是神經元模擬中最基礎的形式。它將外部輸入均解釋為直接作用於細胞膜的電流，與神經元當前的膜電位無關。

## 1. 膜電位微分方程 (Continuous Form)

膜電位 $V$ 隨時間 $t$ 的演化由以下線性微分方程描述：

$$C_m \frac{dV(t)}{dt} = \underbrace{-g_L(V(t) - V_L)}_{\text{Leak}} + \underbrace{I_{syn}(t)}_{\text{Synaptic}} + \underbrace{I_{ext}(t)}_{\text{Electrode}}$$

其中：
- $C_m$: 膜電容 (pF)。
- $g_L$: 漏電導 (nS)。
- $V_L$: 漏電流反轉電位 (mV)。
- $I_{syn}(t)$: 突觸輸入電流 (pA)。
- $I_{ext}(t)$: 外部電極注入電流 (pA)。

## 2. 數值積分：尤拉方法 (Euler Method)

$$V_{t+\Delta t} = V_t + \frac{\Delta t}{C_m} \left[ -g_L(V_t - V_L) + I_{syn}(t) + I_{ext}(t) \right]$$

## 3. 輸入來源的數學定義

### A. 電極注入 ($I_{ext}$)：連續電流與雜訊
模擬微電極直接向胞內灌注電荷。
$$I_{ext}(t) = I_{base}(t) + I_{noise}(t)$$

1. **常數注入 ($I_{base}$)**: 在設定的時間區間內給予恆定電流。
2. **高斯雜訊 ($I_{noise}$)**: 模擬背景隨機波動。
   $$I_{noise} = \sigma \cdot g_L \cdot \sqrt{\frac{\tau_m}{\Delta t}} \cdot N(0, 1)$$

### B. 突觸輸入 ($I_{syn}$)：泊松脈衝與動力學
模擬離散的突觸前脈衝轉換為連續電流。

1. **脈衝事件**: 前級在時刻 $\{t_{sp}\}$ 產生 $\delta$ 脈衝。
2. **突觸動力學**: 脈衝觸發後，電流 $I_{syn}$ 依 $\tau_{syn}$ 呈指數衰減：
   $$\frac{dI_{syn}}{dt} = -\frac{I_{syn}}{\tau_{syn}}$$
3. **$\delta$ 跳躍極限**: 當 $\tau_{syn} \to 0$ 時，模型退化為「瞬間跳躍」。
   - **推導**: 當脈衝強度為 $w$ 時，$\int I_{syn} dt = w$。
   - 代入尤拉公式得：$\Delta V_{spike} = \frac{w}{C_m}$。
   這代表在泊松觸發瞬間，電壓會產生 $w/C_m$ 的階躍。

## 4. 發射與重置邏輯 (Spike & Reset)

1. **Fire**: 若 $V_t \ge V_{th}$，發射 Spike。
2. **Reset**: $V \leftarrow V_{reset}$。
3. **Refractory**: 在 $t_{ref}$ 時間內，膜電壓鎖定，不進行積分。

## 5. 程式碼對照 (`cuba/LIFNeuron.ts`)

```typescript
// 計算總電流 (pA)
const i_leak = -current_gL * (this.v - this.params.V_L);
const i_syn = syn_input;  // 由 Synapse Layer 計算出的衰減電流
const i_ext = ext_current; // I_base + I_noise

const total_i = i_leak + i_syn + i_ext;
const dv = (total_i / this.params.C_m) * dt;
this.v += dv;
```
