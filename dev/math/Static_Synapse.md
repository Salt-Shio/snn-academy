# 靜態突觸 (Static Synapse)

靜態突觸是最基礎的突觸動態模型。在此模型中，突觸沒有資源耗盡或短期記憶的概念。每一次來自突觸前神經元的脈衝，都會產生完全相同強度的訊號增量。

## 1. 核心變數與動態 (Temporal Dynamics)

模型只有單一個狀態變數：
- **$S(t)$ (Signal Strength)**: 突觸訊號強度。這是一個抽象的中介變數，代表釋放出的神經傳導物質在突觸後膜產生的總效應。

### 脈衝觸發更新 (Pulse Update)
當 $t_{sp}$ 時刻發生突觸前脈衝時，訊號強度會瞬間增加一個恆定的權重 $w$（程式碼中的 `weight`）：
$$S^{+} = S^{-} + w$$

### 指數衰減 (Continuous Decay)
在沒有脈衝發生時，訊號強度隨時間 $\tau_{syn}$ 指數衰減：
$$\frac{dS}{dt} = -\frac{S}{\tau_{syn}}$$

## 2. 生理意義與背景 (Biological Significance)

靜態突觸是一種高度理想化的生物物理模型，其假設：
*   **資源無限性**：突觸前末梢的神經傳導物質囊泡（Vesicles）供應永遠充足，不論放電頻率多快，都不會發生資源耗盡（Depression）。
*   **釋放恆定性**：每次脈衝誘發的鈣離子湧入所導致的釋放機率（Release Probability）是恆定的，不會因為連續刺激而易化（Facilitation）。

**應用價值：**
在 SNN 研究中，靜態突觸常用於建立**基準線 (Baseline)**。它能幫助研究者排除突觸本身的動力學干擾，專注於觀察神經元本體的積分特性或網路拓撲造成的影響。

---

## 3. 物理映射：與 LIF 模型的結合

突觸層計算出的抽象訊號 $S(t)$，是推動神經元膜電位變化的輸入源。根據我們採用的物理轉換層（裝飾器），它有兩種不同的代入方式：

### A. 結合 CUBA 模型 (電流基礎, `CubaSynapse.ts`)
在 CUBA 架構中，$S(t)$ 直接被等效為流入細胞的突觸電流 ($I_{syn}$)。
$$I_{syn}(t) = S(t)$$
這意味著每一次脈衝，神經元都會收到一個形狀為完美指數衰減的電流推力，且**每次推力大小恆定**，與當前電壓無關。

### B. 結合 COBA 模型 (電導基礎, `CobaSynapse.ts`)
在 COBA 架構中，$S(t)$ 被等效為離子通道開啟的總電導 ($g_{syn}$)。實際的等效電流大小取決於當前電壓與反轉電位的差距（歐姆定律）。
$$g_{syn}(t) = S(t)$$
$$I_{syn}(t) = -S(t)(V - V_{rev})$$
這意味著雖然突觸本身的開度每次都增加 $w$，但**隨著膜電位 $V$ 靠近 $V_{rev}$，這股推力會越來越弱**（出現飽和效應）。

---

## 3. 程式碼對照 (`synapses/StaticSynapse.ts`)

```typescript
// 1. 脈衝觸發時的原子更新 (step)
if (preSpike) {
    this.signalStrength += this.weight;
}

// 2. 尤拉積分的持續衰減 (來自 BaseSynapse.decay)
if (this.tauSyn > 0) {
    this.signalStrength -= (this.signalStrength / this.tauSyn) * dt;
}
```
