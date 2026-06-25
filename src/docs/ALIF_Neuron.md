# ALIF 適應性模型

## 積分方程
$$C_m \frac{dV(t)}{dt} = -g_L(V(t) - V_L) \mathbf{- w(t)} + I_{syn}(t) + I_{ext}(t)$$
* $w(t)$: 適應性電流 (負反饋)

## 適應性電流 ($w$)
* **時間衰減**: 
  $$\frac{dw}{dt} = -\frac{w}{\tau_w}$$
* **發火增量**: 若發射脈衝 ($V \ge V_{th}$)，瞬間增加 $b$：
  $$w \leftarrow w + b$$
