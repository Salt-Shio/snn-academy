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

- [ ] **Phase 8: LIF 垂直切片教學內容（生物 → 電路 → 數學）**
    - **目標**：只挑 LIF 神經元這一個主題，把「生物直覺 → 電路邏輯 → 數學抽象」三階段一次做完整，驗證這套三階段引導教學體驗是否成立，其他神經元/突觸主題先不擴展。
    - **資料夾結構**（主題為頂層資料夾，視角當子頁，日後每加一個新主題就複製這個結構）：
        ```
        docs/
          lif-neuron/
            biological.md   <- 生物視角
            circuit.md       <- 電路視角
            math.md           <- 數學模型
        ```
        `nav`/`sidebar` 比照 `docs/example/`、`docs/playground/` 已驗證過的路徑分組寫法，用 `/lif-neuron/` 當 key。
    - **技術環境**：確認不需要新裝套件。數學沿用已驗證的 KaTeX；電路圖用手刻 SVG 直接寫在 `.md`（VitePress 原生支援 raw SVG/HTML，Mermaid 不適合畫電路符號，故不引入）；生物視角先做簡化靜態示意圖，之後要做互動動畫時 VitePress 原生支援 Vue-in-Markdown，屆時也不需要額外依賴。
    - **任務**：
        - [ ] **生物視角**（`biological.md`）：LIF 神經元對應的生理機制說明（膜電位、離子流動），簡化版突觸傳遞示意（先用靜態 SVG，不用一次做到最終品質的動畫）。
        - [ ] **電路視角**（`circuit.md`）：LIF 的等效 RC 電路對應（細胞膜 $\to$ 電容 $C_m$、離子通道 $\to$ 電阻 $g_L$、濃度梯度 $\to$ 電池 $V_L$），一張手刻 SVG 電路圖 + 對應說明文字。
        - [ ] **數學模型**（`math.md`）：改寫自 `dev/math/CUBA_LIF.md`，含膜電位微分方程、尤拉積分、發射與重置邏輯，語氣需改為教學向，不可直接照搬開發者筆記。
        - [ ] 三階段串接：確認敘事銜接順暢（例如電路階段開頭應呼應生物階段講過的機制，不是憑空冒出電容概念）。
        - [ ] 三篇都上線後，清掉 `docs/example/`、`docs/playground/` 這兩個架構驗證用的假頁面，連同 `nav`/`sidebar` 設定一併移除。
        - [ ] 驗證完成後才決定：是否橫向擴展到其他主題（COBA、ALIF、STP...），以及是否要做 Phase 6 原本規劃的視覺換皮。
