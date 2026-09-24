# CUBA 突觸：電流基礎

[LIF 公式](/academy/lif/differential-equation) 那頁裡，$I(t)$ 一直被當成「外部給的電流」直接帶過，但 spike 訊號怎麼變成 $I(t)$，其實不只一種做法。這裡先看最簡單的一種：**CUBA(Current-Based，電流基礎)**。

::: tip 突觸方式不只一種
CUBA 之外還有 **COBA(Conductance-Based，電導基礎)**，差別在於「輸入電流要不要考慮神經元目前的電位」——COBA 這部分還在整理中。
:::

## CUBA 的定義

$$I_{syn}(t) = S(t)$$

$S(t)$ 是「突觸訊號強度」，CUBA 的做法就是把它直接當成等效輸入電流疊加，**跟神經元當下的電位 $V(t)$ 無關**——不管神經元現在電位多高多低，同一個訊號進來，貢獻的電流都一樣大。

## 代回 LIF 積分方程

$$C_m \frac{dV_m(t)}{dt} = -g_L(V_m(t) - E_L) + I_{syn}(t)$$

把 $I_{syn}(t) = S(t)$ 代進去，等於是在[基礎 LIF](/academy/neuron/lif-base)原本的 $I(t)$ 那個位置，直接放進突觸訊號強度，不需要額外處理。

## $S(t)$ 從哪裡來

單一顆神經元的角度，$S(t)$ 就只是一個外部給的數字。但當很多顆神經元彼此連接時，$S(t)$ 該怎麼算——也就是「前面誰 spike 了、要貢獻多少電流」——會在下一頁[神經元連接](/academy/lif/neuron-connection)展開，那裡的 $I[t] = \Sigma W$ 就是 CUBA 這條路線的具體例子。
