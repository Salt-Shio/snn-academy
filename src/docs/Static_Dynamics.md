# Static 靜態突觸

## 動態方程
* **脈衝觸發**: 當前級神經元發射脈衝時：
  $$S(t) \leftarrow S(t) + w$$
* **時間衰減**: 
  $$\frac{dS(t)}{dt} = -\frac{S(t)}{\tau_{syn}}$$

* $S(t)$: 突觸訊號強度
* $w$: 固定的突觸權重
* $\tau_{syn}$: 突觸時間常數
