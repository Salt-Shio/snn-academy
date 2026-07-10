# LIF：微分方程

> 待撰寫（改寫自 `dev/math/CUBA_LIF.md`，語氣需教學向，不可直接照搬開發者筆記）。目標：從[等效電路的概念](./circuit-concept.md)的基爾霍夫定律，推導出 Leaky Integrate-and-Fire 的微分方程。

## 膜電位微分方程

（待撰寫）

$$
C_m \frac{dV(t)}{dt} = -g_L(V(t) - V_L) + I_{syn}(t)
$$

## 數值積分：尤拉方法

（待撰寫）

## 發射與重置邏輯

（待撰寫：閾值 $V_{th}$、重置電位 $V_{reset}$、不應期 $t_{ref}$）

---

延伸閱讀（開發者筆記，非教材語氣，位於 `dev/` 不屬於本網站範圍，故不提供連結）：`dev/math/CUBA_LIF.md`
