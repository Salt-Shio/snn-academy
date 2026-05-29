# 電導基礎 Leaky Integrate-and-Fire (COBA LIF) 模型

電導基礎模型 (Conductance-based) 將外部輸入解釋為改變細胞膜的「電導」，其產生的電流大小與當前膜電位有關。

## 1. 膜電位微分方程 (Continuous Form)

$$C_m \frac{dV(t)}{dt} = \underbrace{-g_L(V(t) - V_L)}_{\text{Leak}} + \underbrace{I_{syn}(t)}_{\text{Synaptic}} + \underbrace{I_{ext}(t)}_{\text{Electrode}}$$

其中：
- $I_{syn}(t)$: 突觸輸入電流 (pA)。由物理轉換層 `CobaSynapse.ts` 提供。
- $I_{ext}(t)$: 外部電極注入電流 (pA)。

---

## 2. 物理映射：$I_{syn}$、電導與驅動力

在 COBA 架構下，突觸電流 **$I_{syn}(t)$** 受歐姆定律約束：
$$I_{syn}(t) = -g_{syn}(t)(V(t) - V_{rev})$$

其中突觸電導 $g_{syn}(t)$ 直接對應突觸訊號強度 **$S(t)$**：
$$g_{syn}(t) = S(t)$$

這賦予了系統「非線性飽和」與「增益控制」的生物特性。關於 $S(t)$ 如何隨時間產生與衰減（靜態或具備短期可塑性），請參閱：
*   [靜態突觸 (Static Synapse)](./Static_Synapse.md)
*   [短期可塑性突觸 (STP Synapse)](./STP_Synapse.md)

---

## 3. 數值積分：尤拉方法 (Euler Method)

$$V_{t+\Delta t} = V_t + \frac{\Delta t}{C_m} \left[ -g_L(V_t - V_L) - S(t)(V_t - V_{rev}) + I_{ext}(t) \right]$$

## 4. 特性總結
COBA 模型最逼真的地方在於突觸推力是**動態**的：
1.  **電壓相依**：當 $V$ 接近 $V_{rev}$ 時，推力自動減弱。
2.  **分流效應 (Shunting)**：高電導輸入會有效降低神經元的輸入電阻，縮短膜時間常數。
