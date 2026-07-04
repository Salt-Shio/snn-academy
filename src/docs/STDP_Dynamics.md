# STDP 脈衝時序依賴可塑性

## 跡線 (Traces)
* $P(t)$: 前級發火跡線 ($>0$)，時間常數 $\tau_{stdp}$
* $M(t)$: 後級發火跡線 ($<0$)，時間常數 $\tau_{stdp}$

## 權重更新 ($w$)
* **長效增強 (LTP)**: 
  *(當後級發火瞬間觸發)*
  $$w \leftarrow w + P \times W_{max}$$

* **長效削弱 (LTD)**:
  *(當前級發火瞬間觸發)*
  $$w \leftarrow w + M \times W_{max}$$

## 訊號強度動態 ($S(t)$)
* **脈衝觸發**: 當前級神經元發射脈衝時，以更新後的動態權重 $w(t)$ 注入訊號：
  $$S(t) \leftarrow S(t) + w(t)$$
* **時間衰減**:
  $$\frac{dS(t)}{dt} = -\frac{S(t)}{\tau_{syn}}$$

* $S(t)$: 突觸訊號強度
* $w(t)$: 經 STDP 動態調整後的當前權重（$0 \le w(t) \le W_{max}$）
* $\tau_{syn}$: 突觸時間常數
