# 部署操作手冊：遠端機器常駐部署（systemd + Cloudflare Tunnel）

這份文件記錄怎麼把 SNN Academy 文件站，從本機測試改成部署在一台可以 SSH 上去的遠端機器上，用 systemd 常駐、Cloudflare Tunnel 對外開放。

跟 [Deploy_CloudflareTunnel.md](./Deploy_CloudflareTunnel.md)（本機一次性測試）的差異：
- 建置與伺服器都跑在遠端機器上，不是這台開發機。
- cloudflared tunnel 也改成在遠端機器上執行——tunnel 是哪台機器在跑，就是哪台機器在對外服務，兩邊不能同時掛著同一個 tunnel。
- 用 systemd 常駐，開機、當機重啟都會自動回來，不用手動盯著終端機。

適用環境：遠端機器是 **Debian/Ubuntu（apt）**。其他 distro 的套件安裝指令不一樣，`deploy/remote_setup.sh` 目前只寫給 apt 系統用。

沿用同一個 Cloudflare tunnel（`snn-academy-tunnel`，已經 route 到 `snn.salt-shio.win`），不用重新建立或重新設定 DNS，只是換一台機器執行它。

## 整體流程

1. 遠端機器：clone repo，跑 `deploy/remote_setup.sh`（裝 node/cloudflared、build 一次）
2. 本機（這台開發機）：把既有的 tunnel 憑證 scp 到遠端
3. 遠端機器：寫 `~/.cloudflared/config.yml`
4. 遠端機器：跑 `deploy/remote_install_systemd.sh`（裝成 systemd 常駐）
5. 驗證：`https://snn.salt-shio.win` 打得通
6. 之後內容更新：遠端跑 `deploy/remote_update.sh`

## 步驟 1：遠端機器 clone + 初始設置

在遠端機器的 SSH 連線裡執行：

```bash
git clone https://github.com/Salt-Shio/snn-academy.git
cd snn-academy
./deploy/remote_setup.sh
```

`remote_setup.sh` 會做：
- `apt-get install` 基本工具（curl、git、ca-certificates、gnupg）
- 如果沒有 node，用 NodeSource 官方腳本裝 Node.js LTS
- 如果沒有 cloudflared，加入 Cloudflare 官方 apt repo 後安裝
- `npm install` + `npm run docs:build`

跑完之後，這台機器上已經有一份 build 好的 `docs/.vitepress/dist`，但還沒有 tunnel 憑證，還不能對外服務。

## 步驟 2：把 tunnel 憑證從本機 scp 到遠端

tunnel `snn-academy-tunnel` 的身分憑證目前在這台開發機的 `~/.cloudflared/` 底下：

```
a314c629-ddf7-4e28-9c92-c801b39534f6.json
```

在**這台開發機**（不是遠端）的終端機執行，把這個檔案傳過去（`<REMOTE_HOST>` 換成你 SSH 用的主機別名或使用者@IP）：

```bash
scp ~/.cloudflared/a314c629-ddf7-4e28-9c92-c801b39534f6.json <REMOTE_HOST>:~/.cloudflared/
```

如果遠端的 `~/.cloudflared/` 目錄還不存在，先在遠端跑 `mkdir -p ~/.cloudflared` 再 scp。

這個 json 檔是 tunnel 的私鑰等級資料，不要用 email、Slack 這種未加密管道傳，`scp` 走 SSH 加密連線沒問題。不需要 `cert.pem`——`cert.pem` 只有 `tunnel create` / `tunnel login` / `tunnel route dns` 這種帳號層級操作才需要，單純 `tunnel run` 一個已存在的 tunnel 只需要對應的 credentials json。

## 步驟 3：在遠端建立 config.yml

在遠端機器上：

```bash
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml <<'EOF'
tunnel: snn-academy-tunnel
credentials-file: /home/<REMOTE_USER>/.cloudflared/a314c629-ddf7-4e28-9c92-c801b39534f6.json
ingress:
  - hostname: snn.salt-shio.win
    service: http://localhost:4173
  - service: http_status:404
EOF
```

把 `<REMOTE_USER>` 換成遠端機器上實際登入的使用者名稱，`credentials-file` 要是絕對路徑。

## 步驟 4：裝成 systemd 常駐服務

回到 repo 根目錄，執行：

```bash
./deploy/remote_install_systemd.sh
```

這個腳本會：
- 檢查 `~/.cloudflared/config.yml` 跟 node/npm/cloudflared 都在
- 產生兩個 systemd unit：
  - `snn-academy-docs.service`：跑 `npm run docs:preview`，監聽 `localhost:4173`
  - `snn-academy-tunnel.service`：跑 `cloudflared tunnel --config ~/.cloudflared/config.yml run`
- `systemctl enable --now` 兩個服務（開機自動啟動 + 失敗自動重啟）

跑完會印出兩個服務的狀態，確認都是 `active (running)`。

## 步驟 5：驗證

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://snn.salt-shio.win
```

回 `200` 就代表遠端常駐部署成功。

排錯：

```bash
sudo systemctl status snn-academy-docs.service
sudo systemctl status snn-academy-tunnel.service
sudo journalctl -u snn-academy-docs.service -n 50
sudo journalctl -u snn-academy-tunnel.service -n 50
```

## 內容更新後怎麼處理

改完 `docs/` 內容、commit + push 到 GitHub 之後，在**遠端機器**上：

```bash
cd snn-academy
./deploy/remote_update.sh
```

會做：`git pull` → `npm install` → `npm run docs:build` → `systemctl restart snn-academy-docs.service`。
`snn-academy-tunnel.service` 不用重啟，原因跟本機測試一樣：它只是把流量轉到 `localhost:4173`，文件伺服器重啟後 port 沒變。

## 服務管理常用指令

```bash
# 停止
sudo systemctl stop snn-academy-docs.service snn-academy-tunnel.service

# 啟動
sudo systemctl start snn-academy-docs.service snn-academy-tunnel.service

# 開機自動啟動 / 取消自動啟動
sudo systemctl enable snn-academy-docs.service snn-academy-tunnel.service
sudo systemctl disable snn-academy-docs.service snn-academy-tunnel.service

# 看即時 log
sudo journalctl -u snn-academy-tunnel.service -f
```

## 關於原本的開發機（本機測試環境）

這次把服務移到遠端機器常駐後，開發機這邊就不用再跑 `cloudflared tunnel run` 或 `docs:preview` 了——同一個 tunnel 不應該同時在兩台機器上對外服務，正式服務改由遠端負責。開發機的 `deploy/run.sh`、`~/.cloudflared/config.yml` 留著即可，之後如果要在本機單獨測試改動，還是可以照 [Deploy_CloudflareTunnel.md](./Deploy_CloudflareTunnel.md) 的方式手動跑，但那時候要記得先把遠端的 `snn-academy-tunnel.service` 停掉，避免兩邊搶同一個 tunnel。
