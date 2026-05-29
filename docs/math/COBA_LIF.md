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

### 多離子通道等效性證明 ($g_E, g_I, E_E, E_I$)

在神經科學文獻中，COBA 方程常被寫作包含興奮性 (E) 與抑制性 (I) 兩個通道的形式：
$$\tau_m\frac{dV(t)}{dt} = -(V(t)-V_L) - \frac{g_E(t)}{g_L}(V(t)-E_E) - \frac{g_I(t)}{g_L}(V(t)-E_I) + \frac{I_{ext}}{g_L}$$
*(註：此式是將原微分方程同除以 $g_L$，並定義 $\tau_m = C_m/g_L$ 後的結果。反轉電位常被標示為 $E_x$ 或 $V_{rev,x}$)*

我們的架構之所以能用單一的 $-S(t)(V - V_{rev})$ 涵蓋上述複雜形式，是因為**任意數量的電導分支都可以被數學約化（Mathematical Reduction）為單一有效電導與有效反轉電位**。

假設同時存在興奮性與抑制性輸入，其總突觸電流為：
$$I_{total\_syn} = -g_E(V - E_E) - g_I(V - E_I)$$
展開並提取 $V$：
$$I_{total\_syn} = -(g_E + g_I)V + (g_E E_E + g_I E_I)$$

若令總電流等效為 $-S(t)(V - V_{rev}) = -SV + S V_{rev}$，對比係數即可得到映射關係：
1. **有效總電導 $S(t)$** 是各分路電導的直和：
   $$S(t) = g_E(t) + g_I(t)$$
2. **有效反轉電位 $V_{rev}(t)$** 是各反轉電位的電導加權平均：
   $$V_{rev}(t) = \frac{g_E(t) E_E + g_I(t) E_I}{g_E(t) + g_I(t)}$$

因此，這證明了單一項的表達式在數學上是完備的。無論輸入源有多少種（E, I, NMDA, GABA 等），其物理總和永遠可以被約化為一組動態的 $(S_{eff}, V_{eff})$。

---

## 3. 數值積分：尤拉方法 (Euler Method)

$$V_{t+\Delta t} = V_t + \frac{\Delta t}{C_m} \left[ -g_L(V_t - V_L) - S(t)(V_t - V_{rev}) + I_{ext}(t) \right]$$

## 4. 特性總結
COBA 模型最逼真的地方在於突觸推力是**動態**的：
1.  **電壓相依**：當 $V$ 接近 $V_{rev}$ 時，推力自動減弱。
2.  **分流效應 (Shunting)**：高電導輸入會有效降低神經元的輸入電阻，縮短膜時間常數。
