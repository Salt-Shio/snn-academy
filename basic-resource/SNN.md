# 神經科學中的 LIF 模型 & STDP


$M, P$ 公式省略

$$w_j \leftarrow w_j + M(t) \cdot \bar{g_E}$$
$$w_j \leftarrow w_j + P_j(t) \cdot \bar{g_E}$$

$$g_E(t) \leftarrow g_E(t) + \sum_{j \in \text{spiked}} w_j$$

$$\frac{dg_E(t)}{dt} = -\frac{g_E(t)}{\tau_{syn,E}}$$

---

$$\tau_m \frac{dv}{dt} = -(v - V_L) - \frac{g_E(t)}{g_L}(v - V_E)$$

---

這裡要表達，pre spike 後怎麼改變權重，以及權重怎麼改變電導，電導怎麼和膜電位 LIF 公式搭上關係

# 轉 SNN

## snnTorch

$$\tau_m \frac{dv}{dt} = -(v - V_L) - \frac{g_E(t)}{g_L}(v - V_E)$$


原本是 spike 影響 $w$ 進而影響 $g_E$，然後 $g_E$ 影響 $v$

---

SNN 會變成使用 spike 影響 $w$ 直接影響 $v$，也就是拔掉 $g_E$ 這一層的動態

$$\tau_m \frac{dv}{dt} = -(v - V_L) + \sum_j w_j \delta(t - t_j)$$
$$\text{spike when } t_j$$
$$V_L = 0$$

$$dv = \frac{-v}{\tau_m}dt + \sum_j \frac{w_j}{\tau_m} \delta(t - t_j)$$

為了處理多個突觸改成矩陣運算 & 採用 Euler Method

* $U_{n \times 1}[t] = $ 時間 $t$ 時多個神經元的 $v$
* $X_{n \times 1}[t]$ 表示多個神經元的時間 $t$ 時的 spike 狀態
* $W_{n \times 1}$ 表示多個神經元的 權重

$$dU[t] = \frac{-U[t]}{\tau_m}\Delta t + W \cdot X[t]$$

$$U[t + \Delta t] = U[t] + dU[t]$$

$$U[t + \Delta t] = U[t] + \frac{-U[t]}{\tau_m}\Delta t + W \cdot X[t]$$

$$U[t + \Delta t] = U[t](1 - \frac{\Delta t}{\tau_m}) + W \cdot X[t]$$

---

$$\beta = (1 - \frac{\Delta t}{\tau_m})$$
$$\text{因為 spike 後會重置電位}，補上 -R S[t]$$

---

最後得到 snnTorch 使用的 LIF 方程式

$$U[t + \Delta t] = \beta U[t] + W \cdot X[t] -R S[t]$$

---


$$dv = \frac{-v}{\tau_m}dt + \sum_j \frac{w_j}{\tau_m} \delta(t - t_j)$$

$$dV[t] = \frac{-V[t]}{\tau_m}\Delta t + X[t]$$

---

## SpikeJelly

$$\tau_m \frac{dv}{dt} = -(v - V_L) - \frac{g_E(t)}{g_L}(v - V_E)$$

同樣把電導項換成 Spiking 輸入，spikingjelly 這裡還多了 $b$ (bias)

$$\frac{dv}{dt} = \frac{-(v - V_L)}{\tau_m} - \frac{\sum_j w_{ij} S_j[t] + b_i}{\tau_m}$$

---
* $H[t]$ 是充電後，發放前的電位
* $V[t]$ 是發放後，重置後的電位
* $V_{reset}$ 相當於 $V_L$ (基準膜電位)
* $dt = 1$
* $S[t] = \Theta(H[t]−V_{threshold})$
* $X_i[t] = \sum_j w_{ij} S_j[t] + b_i$


$$dH[t] = H[t] - V[t-1] = \frac{-(V[t-1] - V_{reset})}{\tau} + \frac{X[t]}{\tau}$$

$$H[t] = (1 - \frac{1}{\tau})V[t-1] + \frac{1}{\tau}X[t] + \frac{1}{\tau}V_{reset}$$

預設 $V_{reset} = 0$

$$H[t] = (1 - \frac{1}{\tau})V[t-1] + \frac{1}{\tau}X[t]$$

---


* **當 `decay_input == True` (預設):**
    * 會使用 $\frac{X[t]}{\tau}$
* **當 `decay_input == False`:**
    * 會直接使用 $X[t]$，也就是不讓 $X[t]$ 乘上 $\frac{1}{\tau}$
    * 類似 snnTorch 的 $W \cdot X[t]$

---

* Hard Reset
    * $V[t] = H[t] \cdot (1 - S[t]) + V_{reset} \cdot S[t]$

    * $V[t] = H[t] - S[t] (H[t] - V_{reset})$
        * 假設 spike 後 $S[t] = 1$ 此時 $V[t] = V_{reset}$ 非常直觀
        * 假設 spike 後 $S[t] = 0$ 此時 $V[t] = H[t]$

    * snnTorch 的 Hard Reset 是 $V[t] = H[t] - S[t] R$

* Soft Reset
    * $V[t] = H[t] - V_{threshold} \cdot S[t]$

## snnTorch vs SpikeJelly

| 功能 | snnTorch | SpikeJelly |
| --- | --- | --- |
| 膜電位更新 | $U[t + \Delta t] = \beta U[t] + W \cdot X[t]$ | $H[t] = (1 - \frac{1}{\tau})V[t-1] + \frac{1}{\tau}X[t]$ |
| 脈衝生成 | $S[t] = \Theta(U[t] - V_{threshold})$ | $S[t] = \Theta(H[t]−V_{threshold})$ |
| 重置 | $V[t] = H[t] - S[t] R$ | $V[t] = H[t] - S[t] (H[t] - V_{reset})$ |
| 脈衝衰減 | $X[t]$ | $\frac{X[t]}{\tau}$ or $X[t]$ |
| 基準膜電位 | $V_{reset} = 0$ | $V_{reset}$ |

* $\beta = 1 - \frac{1}{\tau}$

# 替代梯度

以下以 `snnTorch` 為例，spikingjelly 的處理方式類似，只是有些常數不一樣

* $L(\Sigma_t S[t], y)$ 這裡的 $y$ 是 label (這裡是常見的 spike 總和)，$L$ 可以是 CrossEntropyLoss
    * 重點:
        * $U[t]$ 計算出 $S[t]$
        * $U[t]$ 計算出 $U[t+1]$

* $\frac{\partial L}{\partial W} = \Sigma_{t=1}^T \frac{\partial L}{\partial U[t]} \frac{\partial U[t]}{\partial W}$
    * $\frac{\partial U[t]}{\partial W} = X[t - 1]$
    * $\frac{\partial L}{\partial U[t]} = \left(\frac{\partial L}{\partial S[t]} \frac{\partial S[t]}{\partial U[t]}\right) + \left(\frac{\partial L}{\partial U[t+1]} \frac{\partial U[t+1]}{\partial U[t]}\right)$
        * 因為 $L$ 由 $S[t]$ 和 $U[t+1]$ 決定，所以要對這兩項求偏微分
        * 簡單例子:\
            $y = x^2$\
            $z = 3x + 6$\
            $L = y + z$\
            $\frac{\partial L}{\partial x} = \frac{\partial L}{\partial y} \frac{\partial y}{\partial x} + \frac{\partial L}{\partial z} \frac{\partial z}{\partial x} = 1 \cdot 2x + 1 \cdot 3 = 2x + 3$

---

$\frac{\partial L}{\partial U[t]} = \left(\frac{\partial L}{\partial S[t]} \frac{\partial S[t]}{\partial U[t]}\right) + \left(\frac{\partial L}{\partial U[t+1]} \frac{\partial U[t+1]}{\partial U[t]}\right)$

*  $\delta[t] = \frac{\partial L}{\partial U[t]}$ (這是目標)
*  $D[t] = \frac{\partial S[t]}{\partial U[t]}$

* $\frac{\partial U[t+1]}{\partial U[t]} = \frac{\partial (\beta U[t] + W X[t] - R S[t])}{\partial U[t]}$
    $= \beta + 0 - R \frac{\partial S[t]}{\partial U[t]}$


* $\delta[t] = \frac{\partial L}{\partial S[t]} D[t] + \delta[t+1] \left( \beta - R \cdot D[t] \right)$

* $\delta[T] = \frac{\partial L}{\partial S[T]} D[T]$ 因為沒有 $\delta[T+1]$，所以 $\delta[T] = 0$
    * 因此可以不斷下推 $\delta[T] \to \delta[T-1] \to \dots \to \delta[0]$

* $\frac{\partial L}{\partial W} = \sum_{t=1}^T \delta[t] \cdot X[t-1]$

FINAL:

$$\frac{\partial L}{\partial W} = \sum_{t=1}^T \left[ \underbrace{\frac{\partial L}{\partial S[t]} D[t]}_{\text{當下脈衝的誤差}} + \underbrace{\delta[t+1] \left( \beta - R \cdot D[t] \right)}_{\text{從未來退回來的誤差}} \right] X[t-1]$$

---


要處理 $D[t] = \frac{\partial S[t]}{\partial U[t]}$ 這一項\
因為 $S[t] = \Theta(U[t] - V_{threshold})$\
這是不可微的，所以要用替代梯度，本質上就是反向傳播時，透過近似函數來達成

$\Theta(x) = \begin{cases} 1 & x > 0 \\ 0 & x \le 0 \end{cases}$\
$Sigmoid(x) = (\frac{1}{1+e^{-10 x}})$

![alt text](Image/14.png)

---

注意: 

* $\frac{\partial U[t+1]}{\partial U[t]} = \beta - R \frac{\partial S[t]}{\partial U[t]}$
    * $-R \frac{\partial S[t]}{\partial U[t]}$ 這一項會導致震盪
    * 他是有幾會把 $\frac{\partial U[t+1]}{\partial U[t]}$ 搞成負號
    * 最後梯度乘回去 ex: $-1.1 \times -1.1 \times -1.1$ 就會震盪
    * 所以 spikejelly 和 snnTorch 都會把這項設定成 $0$
        * spikejelly 有個 `detach_reset = True` 的參數，就是把這項設成 $0$

