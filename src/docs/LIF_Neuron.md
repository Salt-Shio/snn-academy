# LIF 漏發火模型

## 積分方程
$$C_m \frac{dV(t)}{dt} = -g_L(V(t) - V_L) + I_{syn}(t) + I_{ext}(t)$$
* $C_m$: 膜電容
* $g_L$: 漏電導
* $V_L$: 靜止電位
* $I_{syn}, I_{ext}$: 突觸電流與外部注入電流

## 脈衝與重置
* **發火條件**: 若 $V(t) \ge V_{th}$，觸發 Spike。
* **重置**: 發火後 $V \leftarrow V_{reset}$。
* **不應期**: 發火後 $t_{ref}$ 時間內，電壓維持 $V_{reset}$。
