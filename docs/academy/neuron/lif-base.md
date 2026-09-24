# 基礎 LIF

這是「神經元種類」底下最基礎的一種：標準的 Leaky Integrate-and-Fire(LIF)，沒有額外的適應性電流，也就是主線[LIF 公式](/academy/lif/differential-equation)完整推導過的那個版本：

$$\frac{dV_m(t)}{dt} = -\frac{1}{\tau_m}(V_m(t) - E_L) + \frac{I(t)}{C_m}$$
$$V_m(t_k) \ge V_{th} \to \text{spiking}$$
$$V_m(t) = V_{reset}，\{t_k^+ < t < t_k^+ + \tau_{ref}\}$$

::: tip 跟其他神經元種類的差異
基礎 LIF 假設神經元對持續刺激的反應速率固定不變。之後會補上的 ALIF(適應性 LIF)會讓放電速率隨著連續刺激逐漸變慢，模擬生理上的「頻率適應」現象——這部分還在整理中。
:::

## 完整推導在別頁

公式怎麼從等效電路一步步化簡出來、Euler 離散化怎麼寫、互動式 demo 怎麼跑，都已經在 [LIF 公式](/academy/lif/differential-equation) 這頁講過了，這裡不重複。

## 這裡選它的原因

[神經元連接](/academy/lif/neuron-connection) 的範例就是用這個最基礎的版本，搭配 [CUBA 突觸](/academy/synapse/cuba) 做示範。
