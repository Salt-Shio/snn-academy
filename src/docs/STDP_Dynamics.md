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
