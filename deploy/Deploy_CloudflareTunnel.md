# 部署操作手冊：Cloudflare Tunnel（一次性測試）

這份文件記錄怎麼把 VitePress 建置出來的靜態文件站，透過 Cloudflare Tunnel 對外開放到自己的網域。
目前定位是「打通一次流程」的測試部署，不是常駐服務。
之後若要常駐化，會另外寫 systemd 版本，不要把這份文件直接當成生產環境步驟。

步驟 1～5（安裝、登入、建立 tunnel、路由 DNS、寫設定檔）只需要做一次，做完之後日常啟動可以直接用 [`./deploy/run.sh`](./run.sh)，不用每次都手動打指令。這份文件仍然保留完整的手動步驟，方便第一次設定跟之後排錯用。

## 前置條件

- 專案執行環境固定用 conda `snn-academy`（node/npm 都在這裡）。
  - node/npm 執行檔路徑：`/home/salt/.conda/envs/snn-academy/bin/`
- 系統是 Garuda Linux（Arch-based），`cloudflared` 在官方 `extra` repo 裡，不用裝 AUR。
- 需要一個你在 Cloudflare 帳號底下管理的網域（zone），以及要用的子網域，例如 `docs.yourdomain.com`。
- 以下指令裡出現的 `<SUBDOMAIN>`、`<TUNNEL_NAME>` 都要換成你實際要用的值。

## 步驟 1：安裝 cloudflared

```bash
sudo pacman -S cloudflared
```

這一步需要 sudo 密碼，只能自己在終端機手動執行。

安裝完後確認版本：

```bash
cloudflared --version
```

## 步驟 2：登入 Cloudflare 帳號

```bash
cloudflared tunnel login
```

- 指令會印出一個網址，用瀏覽器打開。
- 登入 Cloudflare 帳號後，選擇你要授權的網域（zone）。
- 授權完成後，會在 `~/.cloudflared/cert.pem` 產生憑證檔，之後的 tunnel 指令都靠這個檔案認證。
- 這一步是瀏覽器互動流程，只能自己執行，沒辦法代跑。

## 步驟 3：建立具名 tunnel

```bash
cloudflared tunnel create <TUNNEL_NAME>
```

- 執行後會輸出一個 Tunnel ID，並在 `~/.cloudflared/` 產生 `<TUNNEL_ID>.json`（credentials 檔）。
- 記下這個 Tunnel ID，下一步設定檔要用。

確認 tunnel 有建立成功：

```bash
cloudflared tunnel list
```

## 步驟 4：把子網域路由到這個 tunnel

```bash
cloudflared tunnel route dns <TUNNEL_NAME> <SUBDOMAIN>
```

- 這一步會直接在你 Cloudflare 帳號的 DNS 裡新增一筆 CNAME 記錄，指向 `<TUNNEL_ID>.cfargotunnel.com`。
- 這是會改動正式 DNS 設定的操作，執行前先確認 `<SUBDOMAIN>` 沒打錯、沒有跟既有記錄衝突。

## 步驟 5：寫 tunnel 設定檔

建立 `~/.cloudflared/config.yml`：

```yaml
tunnel: <TUNNEL_NAME>
credentials-file: /home/salt/.cloudflared/<TUNNEL_ID>.json
ingress:
  - hostname: <SUBDOMAIN>
    service: http://localhost:4173
  - service: http_status:404
```

- `4173` 是 `vitepress preview` 的預設 port。
- `ingress` 規則由上往下比對，最後一條 `http_status:404` 是必要的 fallback，不能省略。

## 步驟 6：建置並啟動本機文件伺服器

```bash
cd /home/salt/Projects/snn-academy
/home/salt/.conda/envs/snn-academy/bin/npm run docs:build
/home/salt/.conda/envs/snn-academy/bin/npm run docs:preview
```

- `docs:build` 會跑 `vue-tsc -b && vitepress build docs`，把 `docs/` 底下的 `.md`、`.vue`、TS 編譯成純 HTML/CSS/JS 靜態檔，輸出到 `docs/.vitepress/dist`。
- `docs:preview` **不是編譯**，它只是把 `dist` 這個資料夾用 HTTP 服務起來，監聽 `http://localhost:4173`，概念上跟 `python -m http.server` 一樣單純：有人打這個 port 就把檔案吐出去。瀏覽器（或這裡的 cloudflared tunnel）要透過 HTTP 連線抓檔案，不能直接讀硬碟裡的 `dist` 資料夾，所以才需要這一步起個伺服器。
- 這裡固定用 `docs:build` + `docs:preview`，**不要用 `docs:dev`**。`dev` 是開發用的即時熱重載伺服器，不是為了對外曝露設計的；`preview` serve 的是 build 產出的靜態快照，行為比較接近正式站，才適合掛在 tunnel 後面對外開放。
- 這兩個指令跟下一步的 tunnel，都要在**你自己的終端機視窗**手動執行，不要交給別人代跑背景 process——這樣你才看得到即時輸出，也才能自己用 `Ctrl+C` 控制關閉。

## 步驟 7：另開一個終端機，啟動 tunnel

```bash
cloudflared tunnel run <TUNNEL_NAME>
```

- 這個 process 也要保持執行，不要關掉。
- 正常會看到連線建立的訊息，沒有報錯代表 tunnel 跟 Cloudflare edge 之間的連線已經打通。

## 步驟 8：驗證

瀏覽器打開：

```
https://<SUBDOMAIN>
```

- 能看到 VitePress 首頁，代表「build → 本機伺服器 → tunnel → DNS → 對外存取」整條路徑打通了。
- 如果打不開，先分別檢查：
  1. `docs:preview` 那個終端機還在跑、port 4173 有沒有回應（`curl http://localhost:4173`）。
  2. `cloudflared tunnel run` 那個終端機有沒有報錯。
  3. Cloudflare Dashboard 的 DNS 頁面，確認 CNAME 記錄有正確指到 `<TUNNEL_ID>.cfargotunnel.com`。

## 日常維護：開啟 / 關閉 / 內容更新

tunnel 跟 DNS 只需要建立一次（步驟 1～5），設定會一直留著。
日常要做的只有「啟動兩個 process」「更新內容後重新 build」「關掉 process」這三件事。

### 開啟

**方式一：用腳本（推薦）**

```bash
cd /home/salt/Projects/snn-academy
./deploy/run.sh
```

這個腳本會依序做：檢查 conda snn-academy 的 npm 跟 cloudflared 存不存在 → `npm run docs:build` → 背景啟動 `npm run docs:preview` → 等本機伺服器有回應 → 背景啟動 `cloudflared tunnel run snn-academy-tunnel`。腳本要在前景跑，兩個服務的輸出會一起印在同一個終端機。按 `Ctrl+C` 會透過 trap 同時關掉本機伺服器跟 tunnel，不會留下殘留 process。

**方式二：手動開兩個終端機**

```bash
# 終端機 A：本機伺服器
cd /home/salt/Projects/snn-academy
/home/salt/.conda/envs/snn-academy/bin/npm run docs:preview

# 終端機 B：tunnel
cloudflared tunnel run snn-academy-tunnel
```

- 兩個都要保持在前景執行，中斷任何一個網站就會斷線。
- 啟動順序不影響結果，但建議先開伺服器、再開 tunnel，比較好排錯。

不管用哪種方式，開好之後都可以用 `curl -s -o /dev/null -w "%{http_code}\n" https://snn.salt-shio.win` 確認回 `200`。

### 關閉

用腳本啟動的話，在同一個終端機按 `Ctrl+C` 即可，腳本會自動關掉兩個服務。
手動開兩個終端機的話，分別 `Ctrl+C` 停掉即可（`docs:preview` 跟 `cloudflared tunnel run`）。
tunnel 跟 DNS 記錄不會因此消失，下次要重開直接回到上面「開啟」的方式。

### 內容更新後怎麼處理

**用腳本的話**：直接 `Ctrl+C` 停掉再重跑 `./deploy/run.sh` 即可，腳本每次啟動都會先重新 `npm run docs:build`。

**手動方式**：`docs:preview` serve 的是 `docs/.vitepress/dist` 這個靜態快照，**改完 `docs/` 底下的內容不會自動反映**，一定要重新 build：

```bash
cd /home/salt/Projects/snn-academy
/home/salt/.conda/envs/snn-academy/bin/npm run docs:build
```

build 完之後，把正在跑的 `docs:preview` 那個 process 停掉（`Ctrl+C`）再重新啟動：

```bash
/home/salt/.conda/envs/snn-academy/bin/npm run docs:preview
```

- `cloudflared tunnel run` **不用重啟**，它只是把流量轉到 `localhost:4173` 這個 port，`docs:preview` 重啟後 port 沒變，tunnel 那邊會自動接得上。
- 如果 build 失敗（例如 `vue-tsc` 型別檢查沒過），`docs:preview` 就繼續 serve 舊的 `dist`，不會自己壞掉，但代表新內容還沒上線，要先把 build 錯誤修掉。

### 整個清掉（不打算再用這個 tunnel 時才做）

```bash
cloudflared tunnel route dns <TUNNEL_NAME> --delete   # 視版本而定，也可以直接到 Cloudflare Dashboard 手動刪 DNS 記錄
cloudflared tunnel delete <TUNNEL_NAME>
```

## 之後：常駐化（先不做，備忘用）

一次性測試通過後，若要變成開機自動啟動的常駐服務，之後要做的事情包含：

- 用 `cloudflared service install` 把 tunnel 註冊成 systemd service，而不是手動跑 `tunnel run`。
- 用穩定的靜態檔案伺服器取代 `vitepress preview`（`preview` 是開發用指令，不建議長期常駐），例如另外起一個簡單的靜態伺服器 serve `docs/.vitepress/dist`，或改用其他工具評估。
- 評估 CI：每次內容更新後要不要自動重新 `docs:build` 並重啟伺服器。

這些留到常駐化階段再展開規劃，現階段先確認一次性流程能跑通。
