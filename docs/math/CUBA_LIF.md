# 電流基礎 Leaky Integrate-and-Fire (CUBA LIF) 模型

CUBA 模型是神經元模擬中最基礎的形式。它將外部輸入均解釋為直接作用於細胞膜的電流，與神經元當前的膜電位無關。

## 1. 膜電位微分方程 (Continuous Form)

膜電壓 $V$ 隨時間 $t$ 的演化由以下線性微分方程描述：

$$C_m \frac{dV(t)}{dt} = \underbrace{-g_L(V(t) - V_L)}_{\text{Leak}} + \underbrace{I_{syn}(t)}_{\text{Synaptic}} + \underbrace{I_{ext}(t)}_{\text{Electrode}}$$

其中：
- $C_m$: 膜電容 (pF)。
- $g_L$: 漏電導 (nS)。
- $V_L$: 漏電流反轉電位 (mV)。
- $I_{syn}(t)$: 突觸輸入電流 (pA)。由物理轉換層 `CubaSynapse.ts` 提供。
- $I_{ext}(t)$: 外部電極注入電流 (pA)。

---

## 2. 物理映射：$I_{syn}$ 與 $S(t)$ 的關係

在 CUBA 架構下，突觸電流 **$I_{syn}(t)$** 直接由突觸訊號強度 **$S(t)$** 決定：
$$I_{syn}(t) = S(t)$$

這代表突觸層輸出的抽象訊號強度（無論是來自靜態還是 STP 突觸）被直接視為等效的注入電流。關於 $S(t)$ 如何隨時間產生與衰減，請參閱：
*   [靜態突觸 (Static Synapse)](./Static_Synapse.md)
*   [短期可塑性突觸 (STP Synapse)](./STP_Synapse.md)

---

## 3. 數值積分：尤拉方法 (Euler Method)

$$V_{t+\Delta t} = V_t + \frac{\Delta t}{C_m} \left[ -g_L(V_t - V_L) + I_{syn}(t) + I_{ext}(t) \right]$$

## 4. 發射與重置邏輯 (Spike & Reset)

1. **Fire**: 若 $V_t \ge V_{th}$，發射 Spike。
2. **Reset**: $V \leftarrow V_{reset}$。
3. **Refractory**: 在 $t_{ref}$ 時間內，膜電壓鎖定，不進行積分。
