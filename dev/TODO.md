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

- [ ] **Phase 8: LIF 垂直切片教學內容（鏡頭優先架構）**
    - **目標**：只挑 LIF 神經元這一個主題，把「生物直覺 → 電路邏輯 → 數學抽象」的引導教學體驗做完整，驗證這套架構是否成立，其他神經元/突觸主題先不擴展。
    - **架構已從「主題優先」改為「鏡頭優先」**（規劃討論見 `dev/Content_Architecture_Plan.md`）：生物、電路、數學是三個平行的頂層分類，不是誰包含誰。生物、電路底下放不綁定特定神經元模型的通用概念頁；每個主題（如 LIF）掛在數學底下自己開資料夾，內含站在該主題角度的收斂頁（用連結引用回生物/電路的通用頁）+ 該主題的推導頁。
    - **資料夾結構**（已依此建立骨架，日後每加一個新主題就在 `math/` 底下複製 `lif/` 這個模式）：
        ```
        docs/
          biological/
            neuron-cell.md          <- 生物：神經細胞（通用概念頁）
          circuit/
            equivalent-circuit.md   <- 電路：等效電路（通用概念頁）
            fpga.md                  <- 電路：FPGA（通用概念頁，佔位）
          math/
            lif/
              biological-concept.md   <- LIF：生物的概念（引用 neuron-cell.md）
              circuit-concept.md      <- LIF：等效電路的概念（引用 equivalent-circuit.md）
              differential-equation.md <- LIF：微分方程（核心推導）
        ```
        `nav`/`sidebar` 已改成 `/biological/`、`/circuit/`、`/math/` 三個平行分組，`/math/` 分組內以主題（目前只有 LIF）呈現子項目。
    - **技術環境**：確認不需要新裝套件。數學沿用已驗證的 KaTeX；電路圖用手刻 SVG 直接寫在 `.md`（VitePress 原生支援 raw SVG/HTML，Mermaid 不適合畫電路符號，故不引入）；生物視角先做簡化靜態示意圖，之後要做互動動畫時 VitePress 原生支援 Vue-in-Markdown，屆時也不需要額外依賴。
    - **任務**：
        - [ ] **生物：神經細胞**（`biological/neuron-cell.md`）：神經元對應的生理機制說明（膜電位、離子流動），簡化版突觸傳遞示意（先用靜態 SVG，不用一次做到最終品質的動畫）。內容需通用化，不綁死 LIF 用語。
        - [ ] **電路：等效電路**（`circuit/equivalent-circuit.md`）：等效 RC 電路對應（細胞膜 $\to$ 電容 $C_m$、離子通道 $\to$ 電阻 $g_L$、濃度梯度 $\to$ 電池 $V_L$），一張手刻 SVG 電路圖 + 對應說明文字。內容需通用化，不綁死 LIF 用語。
        - [ ] **LIF：生物的概念 / 等效電路的概念**（`math/lif/biological-concept.md`、`circuit-concept.md`）：站在 LIF 角度做簡短收斂，不重複通用頁的完整說明，只挑 LIF 用得到的部分。
        - [ ] **LIF：微分方程**（`math/lif/differential-equation.md`）：改寫自 `dev/math/CUBA_LIF.md`，含膜電位微分方程、尤拉積分、發射與重置邏輯，語氣需改為教學向，不可直接照搬開發者筆記。
        - [ ] 敘事銜接：確認 LIF 底下三篇讀起來順暢（生物的概念 → 等效電路的概念 → 微分方程），且各自連回通用頁的引用連結不是憑空冒出。
        - [ ] 內容都上線後，清掉 `docs/example/`、`docs/playground/` 這兩個架構驗證用的假頁面，連同 `nav`/`sidebar` 設定一併移除。
        - [ ] 驗證完成後才決定：是否橫向擴展到其他主題（COBA、ALIF、STP...）並比照 LIF 模式在 `math/` 底下開新資料夾，以及是否要做 Phase 6 原本規劃的視覺換皮。
