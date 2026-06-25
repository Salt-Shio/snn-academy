# STP 短期可塑性 (Tsodyks-Markram)

## 變數
* $R(t) \in [0,1]$: 可用資源比例 (Resources)
* $u(t) \in [0,1]$: 釋放機率 (Utilization)

## 動態方程
* **時間恢復**: 
  $R \to 1$ (速率 $\tau_d$)
  $u \to U_0$ (速率 $\tau_f$)

* **脈衝觸發更新 (依序執行)**: 
  1. **Facilitation**: $u_{n} = u_{old} + U_0 \times (1 - u_{old})$
  2. **Depression**: $R_{consume} = u_n \times R_{old}$
  3. **Update R**: $R_{new} = R_{old} - R_{consume}$
  4. **Output S**: $S(t) \leftarrow S(t) + w \times R_{consume}$
