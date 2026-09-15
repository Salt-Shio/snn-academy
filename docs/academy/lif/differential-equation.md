<script setup>
import LIFSpikeDemo from '../../components/LIFSpikeDemo.vue'
</script>

# LIF：微分方程

承接[等效電路的概念](./circuit-concept.md)推出的電流恆等式，這一頁要分析它「隨時間怎麼跑」，並把它砍成乾淨的 Leaky Integrate-and-Fire。

## 快速複習微分方程

這裡帶過微分方程的特性

* $\frac{dy(t)}{dt} = ay(t)$ 且 $a > 0$
    1. $y(t)$ 的變化 $\frac{dy(t)}{dt}$ $\propto$ $y(t)$ 
        * $y(t)$ 越大 $\to \frac{dy(t)}{dt}$ 越大，$y(t)$ 就`增加得越快`
        * 這是一個`正回饋`的系統，會指數爆炸
    2. 只有 $y(t) = 0$ 時 $\frac{dy(t)}{dt} = 0$
        * 但這個`平衡點是不穩定`的：稍微偏離一點就會被越推越遠，回不來
        * $a$ 代表「變化的速度」：$a$ 越大，$y(t)$ 越快爆炸
    3. 解 ODE 可以得知: $y(t) = c e^{a t}$
        * $c = y(0)$ 是一個常數

* $\frac{dy(t)}{dt} = -ay(t)$ 且 $a > 0$
    1. $y(t)$ 的變化 $\frac{dy(t)}{dt}$ $\propto$ $-y(t)$ 
        * $y(t)$ 越大 $\to \frac{dy(t)}{dt}$ 越負，$y$ 就`掉得越快`
        * 這是一個`負回饋`的系統，會指數衰減
    2. 只有 $y(t) = 0$ 時 $\frac{dy(t)}{dt} = 0$
        * 而且這個`平衡點是穩定`的：偏離了會被拉回來
        * $a$ 代表「變化的速度」：$a$ 越大，$y(t)$ 越快衰減成 0
    3. 解 ODE 可以得知: $y(t) = c e^{-a t}$
        * $c = y(0)$ 是一個常數

::: tip 下面這個是重點
把上面的穩定平衡點從 $0$ 平移到任意的 $b$，就是後面整條膜電位方程的基本零件。
:::

* $\frac{dy(t)}{dt} = -a(y - b)$ 且 $a > 0$ 
    1. $y$ 的變化方向取決於 $b$
        * $y > b$ 時 $\frac{dy}{dt} < 0$，這表示 $y$ 會慢慢往下掉
        * $y < b$ 時 $\frac{dy}{dt} > 0$，這表示 $y$ 會慢慢往上升
        * 這說明 $y$ 會不斷被拉向 $b$
    2. 只有 $y = b$ 時 $\frac{dy}{dt} = 0$，且是**穩定**平衡點
        * $a$ 代表「變化的速度」：$a$ 越大，$y$ 越快被拉向 $b$
    3. 解 ODE 可以得知: $y(t) = b + c e^{-at}$
        * $c = y(0) - b$ 是一個常數

## 膜電位微分方程

![神經元等效電路：膜電容與各離子通道的電池 + 可變電阻](../../public/lif/neuron-circuit-2.png)

<font color="red" size=5>這裡是重點</font>:
* 回到電路篇最後提到的式子，他由很多 $-a(y - b)$ 組成

$$C_m \frac{dV_m(t)}{dt} = - g_L(V_m(t) - E_L) - g_{Na}(t)(V_m(t) - E_{Na}) - g_K(t)(V_m(t) - E_K) - g_H(t)(V_m(t) - E_H) - g_{AHP}(t)(V_m(t) - E_{AHP}) + I(t)$$

* 每項 $-g_X(t)(V_m(t) - E_X)$ 都會把膜電位 $V_m(t)$ 拉向該離子的目標電壓 $E_X$
    * $C_m \frac{dV_m(t)}{dt} = -g_X(t)(V_m(t) - E_X)$ 
        * $g_X(t)$ 是 `變化的速度`: $g_X(t)$ 越大，$V_m(t)$ 越快被拉向 $E_x$
    * $\frac{dy(t)}{dt} = -a(y - b)$
        * $a$ 代表 `變化的速度`： $a$ 越大，$y$ 越快被拉向 $b$
* 雖然有很多項，給個直覺: 就是誰的 $g$ 大，$V_m(t)$ 就偏向誰的 $E_x$

---

::: info 關於單位:
* 下面的電導都寫成「每單位膜面積」的 $mS/cm^2$
* 所以整條式子談的是**電流密度**：$C_m$ 的單位是 $\mu F/cm^2$
* $I(t)$ 的單位是 $\mu A/cm^2$

可以想成跟電學常用的單位一樣，只是每項都是 $/cm^2$，也就是考慮單位面積的情況下
:::

## 方程動態過程

先看幾個假設數值（近似值）：

| 符號 | 電壓 |
|---|---|
| 靜止電位 ($V_{rest}$) | $\approx -70\ mV$ |
| 閾值 ($V_{th}$) | $\approx -55\ mV$ |
| spike ($V_{spike}$) 峰值 | $\approx +30\ mV$ | 

![動作電位波形：靜止電位、閾值、去極化到峰值、再極化與過極化](../../public/lif/anatomy-and-physiology-2e-12-04-07f-webp-2.png)

---

公式中各項電流說明: $-g(t)(V(t) - E)$

| 項 | 目標電壓 $E_X$ | 電導 $g_X(t)$ 的特性 | 最大電導 |
|---|---|---|---|
| $Leak$ | $E_L \approx -70\ mV$ <br>≈ $V_{rest}$ | $g_L(t)$ `固定不變` 當作常數 、很小 | $0.3\ mS/cm^2$ |
| $Na^+$ | $E_{Na} \approx +60\ mV$ <br>很高 | $g_{Na}(t)$ 隨電壓變化的`正回饋` <br>$V_m$ 越大 $g_{Na}(t)$ 越大 <br>直到 $V_m = V_{th}$ 暴衝，`觸發 spike` | $120\ mS/cm^2$ |
| $K^+$ | $E_K \approx -80\ mV$ <br>很低 | 靜止時 $g_K(t) \approx 0$ <br>spike 時才變大（比 $Na^+$ 慢一步） | $36\ mS/cm^2$ |
| $I_H$ | $E_H \approx -30\ mV$ | $V_m$ 越負 $g_H(t)$ 才越大 <br>且反應很慢 | 小（依模型而定） |
| $I_{AHP}$ | $E_{AHP} \approx E_K$ <br>$\approx -80\ mV$ | 每次 spike 後 <br>由流入的 $Ca^{2+}$ 觸發 $g_{AHP}(t)$ 變大 <br>反應很慢 | 小（依模型而定） |

* 注意 $g_{Na}$ 的特性，可以發現他是觸發 spiking (使電壓到達 $V_{spike}$)的 `關鍵因素`
* $I_H, I_{AHP}$ 本身對 spike 的產生沒有直接影響，主要是調整 spike 後的恢復期與頻率，因此待會的內容會忽略他們

---

梳理一下 spike 的過程：

1. **累積階段**：$g_{Na}, g_K \approx 0$，只剩 $Leak$ 和 $I(t)$ 作用。
    * 假設 $I(t)$ 受到刺激變大了，$V_m$ 開始變大，$g_{Na}$ 也開始上升
2. **一過** $V_{th}$
    * $g_{Na}$ 暴衝成幾百倍 $\to -g_{Na}(V_m - E_{Na})$ 變得很有影響力
    * 用極大的力把 $V_m$ 往 $E_{Na}(+60 mV)$ 猛拉 $\to$ 衝出 spike 的上升段。
3. **隨後**：$g_K$ 變大、$g_{Na}$ 自己關閉（去活化）$\to$ 把 $V_m$ 往 $-80\ mV$ 拽回 $\to$ spike 的下降段與過極化。

也就是說，生物篇的**去極化 / 再極化 / 過極化**那整套動作電位，**寫在這條式子裡**，是 $g_{Na}$、$g_K$ 隨電壓自動開關演出來的。

## 化成 LIF(Leaky Integrate-and-Fire)

前面那條公式又臭又長，在數學分析 或 程式模擬都是過於複雜
<br>但看懂行為後，觀察到兩件事：

1. 閾值（$V_{th}$）以下的`累積階段`，其實只剩 $Leak$ 和輸入 $I(t)$
2. 那些電壓門控項（$Na/K/H/AHP$）負責處理 `spiking` 與`重置`。

於是 LIF 的取捨就是： 把離子通道全丟掉、只留 $Leak$ 與 $I(t)$，再用一個條件判斷（過閾值就 spiking & 重置）頂替被丟掉的放電機制。

---

### 保留漏電積分 Leaky Integrate

$$C_m \frac{dV_m(t)}{dt} = -g_L(V_m(t) - E_L) + I(t)$$
$$\tau_m = R_L C_m = \frac{C_m}{g_L}$$
$$\frac{dV_m(t)}{dt} = -\frac{1}{\tau_m}(V_m(t) - E_L) + \frac{I(t)}{C_m}$$

注意: 並不是把複雜的邏輯全部壓縮進 $I(t)$。
<br>$I(t)$ 就只是一個外部刺激電流，**裡面沒有藏一個會被自己觸發、然後暴衝的 $g_{Na}(t)$**。
<br>所以光靠這條式子，$V_m$ 只會被 $I(t)$ 推著慢慢爬，永遠不會自己打出 spike，也不會自己重置。得另外用人工的方式補回來。

### 補上人工機制 Fire(Spike) & Reset

這裡額外假設幾個符號
* $t_k$: 表示第 $k$ 次 spike 發生的時間
* $\tau_{ref}$: 表示 spike 後的不應期長度（這段期間膜電位被強制固定住）
* $V_{reset}$: spike 後被壓回去的電位，這裡就取 $V_{reset} = V_{rest} \approx -70\ mV$

整個流程是:
* 在 $t_k$ 的時候 $V_m(t_k) \ge V_{th}$ 導致 spiking
    * 這裡 spiking 的概念並不是說把 $V_m = V_{spike}$，而是把它當作一個 `事件(有/沒有)`
      <br>$V_m \ge V_{th}$ 的瞬間就會被重置
* spiking 後 ($t^+$) 一段時間內都卡在 $V_{reset}$
  <br>$V_m(t) = V_{reset}，\{t_k^+ < t < t_k^+ + \tau_{ref}\}$
* 過了 $t_k + \tau_{ref}$ 之後解除固定，微分方程從 $V_{reset}$ 重新開始積分，等著下一次過閾值

## LIF 公式整合


$$\frac{dV_m(t)}{dt} = -\frac{1}{\tau_m}(V_m(t) - E_L) + \frac{I(t)}{C_m}$$
$$V_m(t_k) \ge V_{th} \to \text{spiking}$$
$$V_m(t) = V_{reset}，\{t_k^+ < t < t_k^+ + \tau_{ref}\}$$

## 用 Euler Method 改寫 LIF 的公式

為了方便程式模擬以及推導運作過程，要先換成`一步一步推進`的`離散`形式
<br>這裡用 `Euler Method`

核心概念是把微分的定義，用一個有限的步長 $\Delta t$ 去近似:

$$\frac{dV_m(t)}{dt} \approx \frac{V_m(t + \Delta t) - V_m(t)}{\Delta t}$$

代入前面保留下來的 LIF 方程，並整理成`下一步電位 = 這一步電位 + 這一步的變化量`:

$$C_m \frac{dV_m(t)}{dt} = -g_L(V_m(t) - E_L) + I(t)$$
$$\frac{dV_m(t)}{dt} \approx \frac{V_m(t + \Delta t) - V_m(t)}{\Delta t} = -\frac{g_L}{C_m}(V_m(t) - E_L) + \frac{I(t)}{C_m}$$

---

$$\text{移項整理後:}$$
$$V_m(t + \Delta t) = V_m(t) + \Delta t \left[ -\frac{1}{\tau_m}(V_m(t) - E_L) + \frac{I(t)}{C_m} \right]$$
$$V_m[t_k] \ge V_{th} \to \text{spiking}$$
$$V_m[t_k] = V_{reset}，\{t_k^+ < t < t_k^+ + \tau_{ref}\}$$


## 總結與視覺化


實際跑一次上面這三條式子，$V_m(t)$ 長什麼樣子：

<LIFSpikeDemo />
