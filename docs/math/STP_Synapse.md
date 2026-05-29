# 短期可塑性突觸 (Short-Term Plasticity, STP Synapse)

短期可塑性描述了突觸效能在毫秒到秒級時間尺度內，隨突觸前活動歷史而變化的現象。我們採用經典的 Tsodyks-Markram (TM) 模型。

## 1. 核心變數與動態 (Temporal Dynamics)

模型透過三個狀態變數來模擬突觸的完整動態：

- **$R(t)$ (Available Resources)**: 可用資源比例。代表準備好供釋放的神經傳導物質比例。
- **$u(t)$ (Utilization)**: 資源利用率。代表每次脈衝觸發時，有多少比例的可用資源被釋放。
- **$S(t)$ (Signal Strength)**: 突觸訊號強度。代表釋放出的物質在突觸後膜產生的總效應。

### A. 指數恢復與衰減 (Continuous Dynamics)
在沒有脈衝發生時，變數隨時間演化：
$$\frac{dR}{dt} = \frac{1 - R}{\tau_d}, \quad \frac{du}{dt} = \frac{U_0 - u}{\tau_f}, \quad \frac{dS}{dt} = -\frac{S}{\tau_{syn}}$$

### B. 脈衝觸發更新 (Pulse Update)
當 $t_{sp}$ 時刻發生脈衝時，變數**依序**瞬時更新：
1. **利用率提升**: $u^{+} = u^{-} + U_0 (1 - u^{-})$
2. **產生訊號**: $S^{+} = S^{-} + \bar{w} \cdot u^{+} \cdot R^{-}$ （$\bar{w}$ 為最大權重）
3. **資源耗盡**: $R^{+} = R^{-} - u^{+} \cdot R^{-}$

---

## 2. 物理映射：與 LIF 模型的結合

突觸層計算出的抽象訊號 $S(t)$，是推動神經元膜電位變化的輸入源。根據我們採用的物理轉換層（裝飾器），它有兩種不同的代入方式：

### A. 結合 CUBA 模型 (電流基礎, `CubaSynapse.ts`)
在 CUBA 架構中，$S(t)$ 直接被等效為流入細胞的突觸電流 ($I_{syn}$)。
$$I_{syn}(t) = S(t)$$
此組合模擬了**具備短期記憶的電流注入**。即使物理上是線性加法，但注入的電流大小會隨脈衝歷史而增強或減弱。

### B. 結合 COBA 模型 (電導基礎, `CobaSynapse.ts`)
在 COBA 架構中，$S(t)$ 被等效為離子通道開啟的總電導 ($g_{syn}$)。
$$g_{syn}(t) = S(t)$$
$$I_{syn}(t) = -S(t)(V - V_{rev})$$
這是**最逼近生物真實的配置**。突觸推力同時受「突觸前歷史 (STP 動態)」與「突觸後電壓狀態 (COBA 歐姆定律)」的雙重調節。

---

## 3. 生理意義與資訊處理 (Biological Significance & Information Processing)

STP 模型深刻地模擬了突觸末梢的生物物理過程：
*   **$R$ (資源)**：對應突觸前可用囊泡池（Readily Releasable Pool, RRP）。恢復時間 $\tau_d$ 代表了囊泡重新填充的速度。
*   **$u$ (利用率)**：與突觸末梢的殘餘鈣離子（Residual $Ca^{2+}$）濃度有關。連續脈衝會導致鈣離子累積，進而提高後續脈衝的釋放機率。

### 兩大濾波效應：

#### A. 短期抑制 (STD, Short-Term Depression)
*   **生理背景**: $\tau_d \gg \tau_f$。囊泡耗盡的速度遠大於填充速度。
*   **功能**: 充當 **「低通濾波器 (Low-pass Filter)」**。對突發的高頻訊號產生強烈的減益，有助於系統實現自動增益控制，並過濾掉持續性的高頻背景雜訊。

#### B. 短期易化 (STF, Short-Term Facilitation)
*   **生理背景**: $\tau_f \gg \tau_d$ 且基礎釋放率 $U_0$ 較低。鈣離子累積帶來的釋放率提升主導了反應。
*   **功能**: 充當 **「高通濾波器 (High-pass Filter)」** 或 **「爆發偵測器 (Burst Detector)」**。對孤立單個脈衝反應微弱，但對連續「爆發性脈衝」反應極強，有助傳遞時序資訊。

---

## 4. 程式碼對照 (`synapses/STPSynapse.ts`)

```typescript
// 脈衝觸發時的原子更新 (step)
this.u += this.U0 * (1 - this.u); 
const impact = this.weight * this.u * this.R; 
this.signalStrength += impact; 
this.R -= this.u * this.R;
```
