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
- [x] ~~Phase 6: 高級 UI 設計與三階段視角切換 (套皮優化)~~ **[已被取代]**
    - 原規劃是針對動態沙盒（互動模擬 UI）做視覺換皮，該套程式碼已於 `docs/static-content` 分支移除、完整備份於 `archive/dynamic-sandbox` 分支。
    - 專案方向改為 VitePress 靜態教學網站、內容優先，視覺換皮延後到內容驗證過後再說，見下方 Phase 7 起。

- [x] **Phase 7: VitePress 靜態教學網站導入 [已完成]**
    - **目標**：把教學網站從動態沙盒換成 VitePress 靜態站，作為後續內容撰寫的基礎架構。
    - **任務**：
        - [x] 移除舊 Vite SPA（`index.html`、`App.vue`、`main.ts`、`MathDrawer.vue` 等），VitePress 成為唯一入口。
        - [x] 沿用既有 `katex` + `markdown-it-texmath` 組合接進 VitePress markdown pipeline，並修正 `<eq>`/`<eqn>` 標籤被 Vue compiler 忽略渲染的問題。
        - [x] 建立 `docs/example/`、`docs/playground/` 兩個範例分類，驗證側邊欄依路徑分組（多分類情境）正確運作。
        - [x] 清理已無消費者的依賴（Tailwind、markdown-it、lucide-vue-next、根目錄 vite 等）。
        - [x] 整理 `dev/README.md` 文件索引與新增文件流程說明。

- [x] **Phase 8: LIF 垂直切片教學內容 [已完成，架構定案為 topic-first]**
    - **決策更新（2026-09-23）**：本 phase 原規劃的「鏡頭優先」架構——生物 (`biological/`)、
      電路 (`circuit/`)、數學 (`math/{topic}/`) 三個平行頂層分類——**已否決，且從未真正落地**
      （下方任務清單是規劃階段遺留文字，跟實際檔案結構不符；原引用的 `dev/Content_Architecture_Plan.md`
      規劃文件也不存在，已移除死連結）。
    - 改採專案實際在跑的**主題優先 (topic-first) 扁平結構**：`docs/academy/{topic}/`，每個主題
      資料夾內直接放該主題從生物直覺到數學推導的所有頁面，不拆分跨主題共用的通用概念層。
    - **現況**：`docs/academy/lif/` 底下 4 篇內容皆已完成並上線：
        - [x] `biological-concept.md`（生物的概念）
        - [x] `circuit-concept.md`（等效電路的概念）
        - [x] `differential-equation.md`（微分方程）
        - [x] `neuron-connection.md`（神經元連接）
    - [x] sidebar／首頁知識樹已重構為共讀 `docs/shared/academy-map.ts`（內容/結構：node、edge、sidebar）
      + `docs/shared/academy-layout.ts`（純座標 `id -> {x, y}`，手動排版，格式單純方便調整）
      （`docs/.vitepress/config.ts` + `docs/components/KnowledgeTree.vue` 皆已改讀這兩份資料），
      新增頁面只需改 `academy-map.ts` + `academy-layout.ts` 兩個檔案，不用再動 config/元件本身。
    - **資料夾命名慣例**已定案，見 `docs/README.md`。
    - **後續擴充方向已定案**：橫向擴展其他主題（突觸動態、網路組裝、訊號源、量化指標等）時，
      比照 `lif/` 的 topic-first 模式在 `docs/academy/` 底下各自開新資料夾，**不是**回頭比照舊規劃
      在 `math/` 底下開子資料夾。Phase 6 原規劃的視覺換皮仍待評估，跟本次文件架構決策無關。

- [ ] **Phase 9: 文件框架整理**
    - [ ] 清掉 `docs/example/`、`docs/playground/` 架構驗證用假頁面，連同殘留設定一併移除。
    - [x] 新增 `docs/README.md`，補上 `dev/README.md` 一直引用但從未存在的「教學內容寫作流程」說明。
