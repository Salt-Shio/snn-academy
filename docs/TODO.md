# SNN Academy 工作清單 (TODO)

## Phase 4: 受控步進同步模式 [已完成]

根據 `docs/implementation_plan.md` 執行。所有步驟必須手動觸發，嚴禁自動運行。

- [x] **1. 實作 `VisualNetwork.ts` 狀態同步介面**
    - 檔案: `src/lib/snn/visual/core/VisualNeuron.ts` 新增 `voltage` 屬性。
    - 檔案: `src/lib/snn/visual/core/VisualNetwork.ts` 實作 `syncStates(snn)`。
- [x] **2. 實作受控視圖容器 (`TopologyView.vue`)**
    - 檔案: `src/components/TopologyView.vue` 建立 3x2 模型、Toggle 開關與手動步進邏輯。
- [x] **3. 視覺化電壓、電流與發火效果**
    - 檔案: `src/components/NetworkSkeletonView.vue` 實作 HSL 電位漸變、發光特效、即時 $V$ 與 $I$ 標籤。
    - 檔案: `src/lib/snn/neurons/LIFNeuron.ts` 修正不應期內電流不更新的視覺 Bug。
- [x] **4. 整合與最終驗證**
    - 檔案: `src/App.vue` 切換至受控拓樸視圖並通過手動模擬測試。

---

## 未來規劃項目 (Future Phases)

- [x] **Phase 5: 參數互動與實時控制 [已完成]**
    - **目標**：讓學習者能自由調配神經元與突觸的物理參數，並即時反映在步進動態中。
    - **任務**：
        - [x] 於 UI 提供側邊欄控制面板，使用滑桿 (Sliders) 動態調整 SNN 參數。
        - [x] 實作參數與 `SNNNetwork` (核心數學) 與 `VisualNetwork` (視覺幾何) 的實時連動。
- [ ] **Phase 6: 高級 UI 設計與三階段視角切換 (套皮優化)**
    - **目標**：提升設計美感，落實「生物視角 $\to$ 電路視角 $\to$ 數學模型」的三階段教學引導。
    - **任務**：
        - 重構 UI 佈局，套用深色玻璃擬態 (Glassmorphism)、霓虹發光感的高級視覺系統。
        - 引入三大視角的導覽分頁切換，並以平滑的轉場動畫連結（如從生物結構淡化漸變至等效電路元件）。
