# 重構紀錄：SNN 引擎架構大重構與封裝優化 (Commit: 537c89d)

本文件詳細記錄了 `537c89d` 這次重大重構的範圍、修改檔案以及背後的核心設計決策。
這次重構的核心目標是在 **「不改變任何系統模擬行為」** 的前提下，徹底解決封裝破壞（`as any` 與 `instanceof` 濫用）、程式碼重複（DRY 違反）以及模組結構雜亂的問題。

---

## 1. 介面層擴充 (Interface Layer)
為了解決監控層與視覺層為了取得內部狀態而強行破壞封裝的問題，我們建立了正式的資料傳遞通道。

| 檔案 | 變更內容 | 變更理由 |
|---|---|---|
| `ISynapseMonitorData.ts` | **[NEW]** 新增介面。定義了 `signalStrength` 以及 STP/STDP 特有狀態的可選屬性。 | 讓各動態實作能透過統一型別暴露可觀測狀態，使監控層不需要 `instanceof` 即可存取所需資訊。 |
| `ISynapseDynamics.ts` | **[MODIFY]** 新增 `getSignalStrength()` 與 `getMonitorData()` 方法。 | 正式將抽象訊號強度與狀態快照的存取提升至介面契約層級。 |
| `ISynapsePhysics.ts` | **[MODIFY]** 新增 `getDynamics()` 與可選的 `getLastDrivingForce?()` 方法。 | `getDynamics()` 讓監控層能合法取得內部的動態層實例；`getLastDrivingForce` 則是用來解除 SNNNetwork 中對具體 `CobaSynapse` 的強依賴。 |
| `ILearningRule.ts` | **[MODIFY]** 新增 `reset()` 方法。 | 讓 `Connection` 能呼叫標準介面來重置學習規則，不需要再用 `as any` 強轉。 |
| `INetworkNode.ts` | **[MODIFY]** 新增可選的 `getAdaptationCurrent?()` 方法。 | 讓視覺層可以通用地獲取適應性電流，解除對 `ALIFNeuron` 的 `instanceof` 判斷。 |

---

## 2. 核心實作適配 (Core Implementation)
讓所有的核心類別去滿足 Phase 1 擴充的新介面。

| 檔案 | 變更內容 | 變更理由 |
|---|---|---|
| `BaseSynapse.ts` | **[MODIFY]** 實作 `getMonitorData()`，預設回傳 `signalStrength`。 | 滿足 `ISynapseDynamics` 介面，為子類提供基礎。 |
| `STPSynapse.ts`<br>`STDPSynapse.ts` | **[MODIFY]** Override `getMonitorData()`，分別補上 `stpR`, `stpU` 以及 `stdpWeight` 等專屬跡線。 | 透過多型 (Polymorphism) 暴露具體狀態，符合物件導向原則。 |
| `CubaSynapse.ts`<br>`CobaSynapse.ts` | **[MODIFY]** 實作 `getDynamics()`；`CobaSynapse` 額外實作 `getLastDrivingForce()` 並在內部記錄驅動力。 | 滿足新的物理層介面要求，成為完美的裝飾器。 |
| `Connection.ts` | **[MODIFY]** 新增 `resetAll()` 邏輯，依序呼叫傳遞層與學習層的 `reset`。 | 集中重置邏輯，修復原本依賴物件記憶體位址比對 (`!==`) 的 Patch 寫法。 |
| `SNNNetwork.ts` | **[MODIFY]** 移除對具體 `CobaSynapse` 的 `import`。改用 `getLastDrivingForce?.()` 取代 `instanceof` 判斷。 | 讓核心引擎完全與具體的突觸物理模型解耦（遵循開放封閉原則 OCP）。 |

---

## 3. 監控與視覺層 (Consumers)
利用新開出的合法介面，徹底拔除架構中的壞味道。

| 檔案 | 變更內容 | 變更理由 |
|---|---|---|
| `SynapseMonitor.ts` | **[MODIFY]** 移除對 `STDPSynapse` 的依賴與 `instanceof` 檢查，改用 `getDynamics().getMonitorData()`。 | 讓 Monitor 變成通用監聽器，未來新增任何學習規則都不需要再修改 Monitor 程式碼。 |
| `VisualNetwork.ts` | **[MODIFY]** 改用 `getAdaptationCurrent?.()` 與 `getMonitorData()` 進行狀態同步。 | 移除了 3 層 `instanceof` 檢查與 `as any` 穿越，確保視覺層的高擴充性。 |

---

## 4. DRY 原則與職責分離 (Separation of Concerns)
解決 God Component 的問題，將複雜邏輯從 Vue 元件中抽離。

| 檔案 | 變更內容 | 變更理由 |
|---|---|---|
| `NetworkFactory.ts` | **[NEW]** 集中實作 `createNeuron` 與 `createSynapseChain`。 | 原本在不同的 Vue 元件裡都有數十行完全相同的網路節點與突觸「組裝」邏輯，現在統一委派給工廠方法處理。 |
| `chartUtils.ts` | **[NEW]** 將 4 個計算 SVG 路徑的純函式 (`getVoltagePath` 等) 從組件中抽出，放置於 `visual/utils/`。 | 將複雜的數學與畫面渲染邏輯分離，保持 Vue 元件的輕量化。 |
| `BasicLIFSandbox.vue`<br>`TopologyView.vue` | **[MODIFY]** 刪除內部的組裝與繪圖函式，全面改用上述的 Factory 與 Utils。 | 元件行數大幅減少，職責回歸純粹的 UI 渲染與 Vue 響應式狀態管理。 |

---

## 5. 清理與組織 (Cleanup & Organization)
整頓雜亂的結構與過時的寫法。

| 檔案 | 變更內容 | 變更理由 |
|---|---|---|
| `ISynapse.ts` | **[DELETE]** 刪除檔案。 | 這是重構前遺留的死碼，沒有任何類別實作它，留著只會造成後續開發者的混淆。 |
| `PoissonSource.ts`<br>`GWNSource.ts` | **[MOVE]** 搬移至 `src/lib/snn/sources/` 中。 | 統一目錄組織，對齊 `neurons/` 與 `synapses/` 的子目錄結構。 |
| `style.css` | **[MODIFY]** 刪除 Vite 初始化專案時遺留的未使用的 CSS class (`.hero` 等)。 | 程式碼衛生。 |
| 各模組 `index.ts` | **[NEW]** 為 `network`、`neurons`、`synapses`、`sources` 建立 Barrel Exports。 | 提供乾淨的模組入口。 |
| 所有依賴端檔案 | **[MODIFY]** 更新 `import` 路徑，強制使用 Barrel Exports（例如 `import { ... } from '../lib/snn/network'`）。 | 消除原先深層且冗長的檔案路徑依賴，提升重構彈性。 |
