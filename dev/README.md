# SNN 數學模型說明文件

本目錄存放專案實作中所有神經元模型與突觸機制的數學原理，旨在讓學習者能夠透明地對照程式碼與底層公式。

**這裡是給開發者看的技術筆記**，記錄設計決策與數學推導本身；不是給學習者看的教材。教學網站的內容在 `docs/`（VitePress），寫作流程另見該目錄下的說明。兩邊不要混著寫。

## 目錄

### 神經元模型
1. [基礎 CUBA LIF 模型](./math/CUBA_LIF.md) - Current-based LIF
2. [電導基礎 LIF 模型](./math/COBA_LIF.md) - Conductance-based LIF
3. [適應性 ALIF 神經元](./math/ALIF_Neuron.md) - Spike-Frequency Adaptation

### 突觸模型
4. [靜態突觸](./math/Static_Synapse.md) - Static Synapse
5. [短期可塑性](./math/STP_Synapse.md) - STP (Short-Term Plasticity)
6. (規劃中) 脈衝時序依賴可塑性 - STDP

### 訊號源與量化指標
7. [泊松脈衝源](./math/Poisson_Source.md) - Poisson Spike Process
8. [高斯白雜訊源](./math/GWN_Source.md) - Gaussian White Noise
9. [特性量化指標](./math/Metrics.md) - F-I Curve & CV_ISI

### 架構文件
另見 [`system_structure/`](./system_structure/Architecture.md)：系統模組職責、類別關聯圖、資料流向圖。

---

## 新增文件的流程

寫新筆記前，先確認屬於哪一類，兩類的骨架不一樣：

### 1. 決定分類
- **`math/`**：單一模型/機制的數學推導（神經元、突觸、訊號源、量化指標）。
- **`system_structure/`**：跨模組的架構說明（模組職責、類別關聯、資料流向）。
- 不確定時看內容主體——在講一個方程式怎麼來的，放 `math/`；在講幾個檔案怎麼互相呼叫，放 `system_structure/`。

### 2. 命名規則
沿用現有慣例：`<主題>_<類別>.md`，類別用 `Neuron`（神經元）、`Synapse`（突觸）、`Source`（訊號源）結尾，例如 `ALIF_Neuron.md`、`STP_Synapse.md`、`GWN_Source.md`。量化指標類例外，直接用主題命名（`Metrics.md`）。

### 3. `math/` 筆記的標準骨架
對照 `CUBA_LIF.md`、`STP_Synapse.md`、`Static_Synapse.md` 等既有文件，共同結構是：

```md
# <中文名稱>（<英文/縮寫>）

一段話說明這是什麼、解決什麼問題。

## 1. 核心變數與動態
狀態變數定義 + 微分方程（連續動態）+ 脈衝觸發時的瞬時更新規則。

## 2. 物理映射：與 LIF 模型的結合
分別說明結合 CUBA（`I_syn(t) = S(t)`）與 COBA（`I_syn(t) = -S(t)(V - V_rev)`）
時的行為差異，指出程式碼對應檔名（如 `CubaSynapse.ts`）。

## 3. 生理意義
對應到真實生理機制的類比與功能解釋。

## 4. 程式碼對照
貼一小段實際邏輯的 TypeScript 片段（不用整個檔案，只放核心那幾行），
標明對應檔案路徑。
```

不是每篇都要四節齊全（例如 `Metrics.md` 是量化指標，結構會不同），但「先講變數/方程式、再講物理意義、最後對照程式碼」這個順序要保留，方便跟其他筆記互相參照時邏輯一致。

### 4. `system_structure/` 文件的標準骨架
對照 `Architecture.md`：模組職責說明（分層列點）→ Mermaid `classDiagram`（類別關聯）→ Mermaid `sequenceDiagram`（資料流向）→ 文字說明渲染週期或執行順序。重構後記得回來更新對應的 Mermaid 圖，不要讓圖跟實際程式碼脫節。

### 5. 交叉引用
同目錄內用相對路徑連結，例如 `[短期可塑性](./STP_Synapse.md)`；程式碼檔名一律用反引號標出（`` `CubaSynapse.ts` ``），不要寫死絕對路徑。

### 6. 新增後，回頭更新這份索引
建立新檔案後，一定要回來把連結加進本文件最上面的「目錄」——這份索引之前就曾經跟實際檔案脫節過（連結到已經改名/不存在的檔案），養成新增檔案就同步更新索引的習慣，避免死連結累積。
