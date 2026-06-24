# Phase 4 工作清單 (TODO) - 受控步進同步模式

根據 `docs/implementation_plan.md` 執行。所有步驟必須手動觸發，嚴禁自動運行。

## 實作項目清單

- [x] **1. 實作 `VisualNetwork.ts` 狀態同步介面**
    - 檔案: `src/lib/snn/visual/core/VisualNeuron.ts`
    - 任務: 新增 `voltage: number` 屬性。
    - 檔案: `src/lib/snn/visual/core/VisualNetwork.ts`
    - 任務: 實作 `syncStates(snn: SNNNetwork)`，同步每個節點的 `voltage` 與 `isSpiking = hasSpiked`。

- [x] **2. 實作受控視圖容器 (`TopologyView.vue`)**
    - 檔案: `src/components/TopologyView.vue`
    - 任務: 
        - 建立 3x2 的 `VisualNetwork` 與對應的 `SNNNetwork` 數學實體。
        - 建立 3 個 UI 開關 (pre-0~2) 與 1 個 「Step (0.1ms)」 按鈕。
        - 實作步進邏輯：按下按鈕時，根據開關狀態注入電流，執行一次 `step()`。

- [ ] **3. 視覺化電壓與發火效果**
    - 檔案: `src/components/NetworkSkeletonView.vue`
    - 任務: 
        - 修改大圓渲染，使其顏色隨 `voltage` 變化（如深藍到亮紅的過渡）。
        - 發火 (`isSpiking`) 時顯示最強亮度的視覺回饋。

- [ ] **4. 整合與最終驗證**
    - 檔案: `src/App.vue`
    - 任務: 切換至 `TopologyView`，由使用者進行手動步進測試，驗證 3x2 連線邏輯。
