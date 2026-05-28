# 電導基礎 Leaky Integrate-and-Fire (COBA LIF) 模型

電導基礎模型 (Conductance-based) 是對基礎 CUBA 模型的一種重要生物物理擴充。在 COBA 中，輸入不再是簡單的電流，而是改變細胞膜的「電導」。

## 1. 膜電位微分方程

在多通道驅動下，膜電位的變化遵循以下方程：

$$C_m \frac{dV(t)}{dt} = -g_L(V(t) - V_L) - g_E(t)(V(t) - V_E) - g_I(t)(V(t) - V_I) + I_{ext}(t)$$

其中：
- $C_m$: 膜電容 (Membrane Capacitance, pF)。
- $g_L$: 漏電導 (Leak Conductance, nS)。
- $V_L, V_E, V_I$: 分別為漏電流、興奮性、抑制性的**反轉電位 (Reversal Potential)**。
- $g_E(t), g_I(t)$: 隨時間變化的興奮性與抑制性**突觸電導**。
- $I_{ext}(t)$: 外部電極直接注入的電流（如常數注入或 GWN）。

## 2. 核心觀念：驅動力 (Driving Force)

COBA 模型與 CUBA 模型最大的差異在於「驅動力」項：
- **CUBA**: 注入電流 $I_{inj}$ 是恆定的，與 $V$ 無關。
- **COBA**: 產生的電流為 $I_{syn} = g_{syn}(V - V_{rev})$。

### 生理意義
當膜電位 $V$ 接近某個通道的反轉電位 $V_{rev}$ 時，離子濃度梯度與電位的合力會變小，導致即便通道開得再大（$g_{syn}$ 很大），產生的電流也會趨於飽和甚至停止。這解釋了為什麼神經元的反應具有**非線性飽和**的特性。

## 3. 數值積分實作 (`neurons/coba/LIFNeuron.ts`)

我們使用離散化的尤拉方法更新電位：

$$V_{t+\Delta t} = V_t + \frac{\Delta t}{C_m} \left[ -g_L(V_t - V_L) - g_E(V_t - V_E) - g_I(V_t - V_I) + I_{ext} \right]$$

## 4. 模型對比總結

| 特性 | CUBA (Current-based) | COBA (Conductance-based) |
| :--- | :--- | :--- |
| **輸入解釋** | 外部輸入 = 電流項 $I_{inj}$ | 外部輸入 = 通道電導 $g_{syn}$ |
| **電壓關係** | 電壓爬升與當前 $V$ 無關 | 電壓爬升隨 $V$ 接近 $V_{rev}$ 而減速 |
| **物理參數** | 隱含在 $\tau_m$ 中 | 需要明確定義 $C_m, V_E, V_I$ |
| **生物逼真度** | 低（線性簡化） | 高（反映離子通道物理） |
