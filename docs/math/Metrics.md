# 神經元特性量化指標 (Neuron Metrics)

為了量化神經元的輸入輸出關係以及放電的隨機性，我們引入了兩個核心指標：F-I 曲線與 $CV_{ISI}$。

## 1. F-I 曲線 (Frequency-Intensity Curve)

F-I 曲線描述了神經元的「增益特性」，即輸出放電頻率 $f$ 隨輸入總強度 $I_{in}$ 變化的函數關係。

### A. 解析解推導 (Mathematical Derivation)

為了推導放電頻率 $f$ 與輸入強度 $I_{in}$ 的關係，我們從膜電位微分方程出發：
$$C_m \frac{dV}{dt} = -g_L(V - V_L) + I_{in}$$

#### 1. 輸入組成與映射
輸入強度 $I_{in}$ 是所有外部驅動力的總和：
$$I_{in}(t) = I_{syn}(t) + I_{ext}(t)$$

根據模型不同，突觸電流 $I_{syn}$ 與訊號強度 $S(t)$ 的關係為：
*   **CUBA 模型**: $I_{syn}(t) = S(t)$
*   **COBA 模型**: $I_{syn}(t) = -S(t)(V - V_{rev})$

#### 2. 求解穩態電位 $V_\infty$
假設電壓不被閾值限制，當 $t \to \infty$ 時電位會趨於穩定。令 $\frac{dV}{dt} = 0$：
$$V_\infty = V_L + \frac{I_{in}}{g_L}$$

#### 3. 最終頻率公式
考慮到放電後的不應期 $t_{ref}$，一個完整的放電週期為 $T_{total} = t_{ref} + T_{isi}$。頻率 $f$ 即為週期的倒數：
$$f(I_{in}) = \frac{1}{t_{ref} + \frac{C_m}{g_L} \ln \left( \frac{(V_L + I_{in}/g_L) - V_{reset}}{(V_L + I_{in}/g_L) - V_{th}} \right)}$$

### B. 數值掃描實作 (Numerical Scan)
在沙盒中，我們透過「原子模擬」來獲得最真實的特性：
1. **強度走訪**：在指定區間內（如 0 到 800 pA），以固定步長進行走訪。
2. **頻率換算**：統計 1 秒內的總脈衝數，該數值即為 Hz。

這種方法的優點是：**即使神經元內部邏輯變得複雜（如加入適應性電流），F-I 曲線仍能準確反映其實際行為。**

---

## 2. 放電變異係數 ($CV_{ISI}$)

$CV_{ISI}$ (Coefficient of Variation of Inter-Spike Intervals) 是衡量脈衝序列「規律性」的無因次指標。

### A. 定義
假設一系列脈衝時間為 $\{t_1, t_2, ..., t_n\}$，其脈衝間隔 (ISI) 為 $ISI_i = t_{i+1} - t_i$。

$$CV_{ISI} = \frac{\sigma_{ISI}}{\mu_{ISI}}$$

### B. 生理意義
- **$CV_{ISI} \approx 0$ (極規律)**：常見於強大的恆定電流驅動。
- **$CV_{ISI} \approx 1$ (泊松隨機)**：常見於隨機突觸輸入，代表放電過程接近無記憶的隨機過程。
- **$CV_{ISI} > 1$ (叢集/爆發性)**：代表脈衝傾向於在短時間內成群出現。
