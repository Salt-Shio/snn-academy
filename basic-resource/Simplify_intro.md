![alt text](Image/1.png)

* 基本的模型: 
    * 充電: $\tau_m \frac{dV}{dt} = -(V - E_L) + \frac{I_{in}}{g_L}$
    * 放電 (Spike): $V > V_{threshold}$ 時發放 Spike，並將膜電位設回 $V_{reset}$
    * $I_{in}$: 外部輸入

* 當 $I_{in}$ 來自其他神經元，就可以開始處理神經網路的連接
    * $I_{in} = \sum_j w_j \delta(t - t_j)$
    * 充電: $\tau_m \frac{dv}{dt} = -(v - V_L) + \sum_j w_j \delta(t - t_j)$
    * 放電(Spike): $v > V_{threshold}$ 時發放 Spike，並將膜電位設回 $V_{reset}$

---

* 簡化 & 離散化 (spkiingjelly 的寫法)
    * 充電: $H[t] = (1 - \frac{1}{\tau})V[t-1] + \frac{1}{\tau}X[t]$
        * $X[t]$ 代表輸入神經元在時間 $t$ 發放 Spike
    * 放電(Spike): $V[t] = H[t] - S[t] (H[t] - V_{reset})$
        * 當 $H[t] > V_{threshold}$ 時，$S[t] = 1$，將膜電位設回 $V_{reset}$
        * 所以 $S[t] = 0$ 時 $V[t] = H[t]$ (充電)
        * 所以 $S[t] = 1$ 時 $V[t] = V_{reset}$ (放電)

---

![alt text](Image/15.png)

實作上跟 torch 類似，一樣會定義連接層，但是激活函數換成上面的方程式

ANN 是: 
$$z = Sigmoid(Wx + b)$$

SNN 是自帶時間維度: 
$$z[t] = LIF(W x[t-1] + b)$$

天生適應動態的輸入

假設要處理一個靜態的圖片，需要將靜態的圖片轉換成動態序列，例如根據顏色深度有不同的 spike 發放頻率，參考 `\train\SNN_FC\show_input.py`

模型輸出也是多個 $y1[t], y2[t], \dots$，假設要當作標籤，常見的策略就是比較 $sum(y1), sum(y2), \dots$，看哪一個最大就當作標籤

---

訓練方式: BPTT (近似梯度下降) 比較穩

另一派: STDP (脈衝時程可塑性) 模擬神經元突觸可塑性

---

題目: **動態**手勢識別 控制 ???

* SNN 跑在 馮紐曼架構的電腦 無法發揮優勢，因此選擇 FPGA
    * 自訂邏輯單元
    * 設計上只有 spike 才計算，而不是類似 ann 全部都算 (比較省電)

* 怎麼用/是否用 CNN ? BSNN
* 深度影像透過兩偵相減 & 天生濾除背景
    * DVS 太貴了
    * 普通相機可以，也得用兩偵相減，但是要處理雜訊，效果不確定
* 難題: 沒有物件檢測的結構
* 實驗方式: 電腦模擬確認效果在轉上去 FPGA (PYNQ-Z2)
