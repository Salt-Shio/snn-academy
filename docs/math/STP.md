# 突觸短期可塑性 (Short-Term Plasticity, STP)

短期可塑性描述了突觸效能在毫秒到秒級時間尺度內，隨突觸前活動歷史而變化的現象。我們採用經典的 Tsodyks-Markram (TM) 模型來實作。

## 1. 核心變數

模型透過兩個狀態變數來模擬突觸前的生理狀態：

- **$R(t)$ (Available Resources)**: 可用資源比例。代表突觸末梢準備好可供釋放的囊泡比例。初始值為 1.0。
- **$u(t)$ (Utilization)**: 資源利用率。代表每次脈衝觸發時，有多少比例的可用資源被釋放。其受 $Ca^{2+}$ 濃度動態影響。

## 2. 動態方程 (Continuous Form)

在沒有脈衝發生時，變數隨時間指數恢復：

$$\frac{dR}{dt} = \frac{1 - R}{\tau_d}$$
$$\frac{du}{dt} = \frac{U_0 - u}{\tau_f}$$

其中：
- $\tau_d$: 恢復時間常數 (Depression time constant)。
- $\tau_f$: 易化時間常數 (Facilitation time constant)。
- $U_0$: 基礎利用率 (Base release probability)。

## 3. 脈衝觸發更新 (Pulse Update)

當 $t_{sp}$ 時刻發生突觸前脈衝時，變數進行瞬時更新：

1. **更新利用率**: $u^{+} = u^{-} + U_0 (1 - u^{-})$
2. **計算產生的電導/電流增量**: $\Delta S = \bar{w} \cdot u^{+} \cdot R^{-}$
3. **耗盡資源**: $R^{+} = R^{-} - u^{+} \cdot R^{-}$

## 4. 突觸訊號演化

突觸產生的訊號 $S$（在 COBA 中為 $g_{syn}$，在 CUBA 中為 $I_{syn}$）隨時間指數衰減：

$$\frac{dS}{dt} = -\frac{S}{\tau_{syn}}$$

## 5. 兩大效應

透過調整 $\tau_d$ 與 $\tau_f$ 的相對大小，可以模擬不同的突觸特性：

### A. 短期抑制 (STD, Short-Term Depression)
- **條件**: $\tau_d \gg \tau_f$。
- **現象**: 資源耗盡速度快於恢復速度。在高頻刺激下，後續反應迅速減弱。
- **作用**: 充當「低通濾波器」，過濾持續的高頻雜訊。

### B. 短期易化 (STF, Short-Term Facilitation)
- **條件**: $\tau_f \gg \tau_d$ 且 $U_0$ 較小。
- **現象**: 利用率的累積增長蓋過了資源的緩慢耗盡。在前幾個脈衝後，反應逐漸增強。
- **作用**: 充當「高通濾波器」，增強對爆發性訊號 (Burst) 的敏感度。

## 6. 程式碼對照 (`synapses/STPSynapse.ts`)

```typescript
// 脈衝觸發時的原子更新
this.u += this.U0 * (1 - this.u); // 利用率提升
const impact = this.weight * this.u * this.R; // 計算影響力
this.currentValue += impact; // 疊加至當前電導/電流
this.R -= this.u * this.R; // 資源耗盡
```
