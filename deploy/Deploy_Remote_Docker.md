# 部署操作手冊：遠端機器 Docker 部署

這份文件取代 [Deploy_Remote_Systemd.md](./Deploy_Remote_Systemd.md) 的做法：不再直接把 node/cloudflared 裝在主機上用 systemd 常駐，改成兩個 Docker container：

- `snn-academy-docs`：nginx，裡面只有 build 好的靜態網頁檔案，沒有 Node.js、沒有原始碼。
- `snn-academy-tunnel`：Cloudflare 官方的 cloudflared image，負責建立對外連線。

兩個 container 用同一個 Docker 內部網路互連，**不對主機開放任何 port**，跟主機上其他服務（例如 SaltVault）完全隔離。

相關檔案：
- `deploy/docker/Dockerfile`：兩階段 build（Node.js build 靜態檔 → 丟進乾淨的 nginx image）
- `deploy/docker/nginx.conf`：nginx 設定
- `deploy/docker/docker-compose.yml`：定義兩個 container 怎麼開、怎麼連

## 前提

- 遠端機器已經裝好 Docker（跟 SaltVault 用同一套）。
- 之前照 [Deploy_Remote_Systemd.md](./Deploy_Remote_Systemd.md) 設好的 `snn-academy-docs.service`、`snn-academy-tunnel.service` 兩個 systemd 服務要先關掉，不然會跟新的 container 搶同一個 tunnel。
- repo 已經 clone 在遠端機器上（`~/Project/snn-academy`），且已經 `git pull` 到含有 `deploy/docker/` 的版本。

## 步驟 1：停用舊的 systemd 服務

```bash
sudo systemctl stop snn-academy-docs.service snn-academy-tunnel.service
sudo systemctl disable snn-academy-docs.service snn-academy-tunnel.service
```

只是停用，不刪除 unit 檔，之後想切回去還可以用。

## 步驟 2：改寫 tunnel 設定檔，改成給 container 用的版本

現有的 `~/.cloudflared/config.yml` 是給「直接在主機上跑」的版本用的，裡面 `service` 寫的是 `http://localhost:4173`、`credentials-file` 寫的是主機上的絕對路徑。

Docker 版本裡，cloudflared 是另一個 container，要透過 Docker 內部網路用 **service 名稱** `docs` 連過去（不是 `localhost`），憑證檔案的路徑也要改成 container 內部看到的路徑（因為我們會把整個 `~/.cloudflared` 目錄掛進 container 的 `/etc/cloudflared`）：

```bash
cat > ~/.cloudflared/config.yml <<'EOF'
tunnel: a314c629-ddf7-4e28-9c92-c801b39534f6
credentials-file: /etc/cloudflared/a314c629-ddf7-4e28-9c92-c801b39534f6.json
ingress:
  - hostname: snn.salt-shio.win
    service: http://docs:80
  - service: http_status:404
EOF

cat ~/.cloudflared/config.yml
```

`tunnel:` 這裡故意用 **UUID**（tunnel 的 ID），不是用名稱 `snn-academy-tunnel`。用名稱的話 cloudflared 需要呼叫 Cloudflare API 把名稱轉成 ID，那一步需要 `cert.pem`；我們沒有把 `cert.pem` 放進 container，用 UUID 就能直接從憑證檔案本地解析，不需要呼叫 API。

## 步驟 3：建立 .env，讓 cloudflared container 用跟主機使用者相同的 UID/GID 跑

`~/.cloudflared/` 底下的憑證檔權限很嚴格（只有主機上的 owner 能讀），這是對的，不應該為了讓 container 讀到就放寬權限。正確做法是讓 container 裡的 process 用跟主機使用者相同的 UID/GID 跑：

```bash
cd ~/Project/snn-academy/deploy/docker
printf "UID=%s\nGID=%s\n" "$(id -u)" "$(id -g)" > .env
cat .env
```

（`UID` 在 bash 裡是唯讀變數，不能用 `UID=$(id -u) docker compose ...` 這種方式內聯帶進去，會被 bash 擋掉，所以才用寫進 `.env` 檔案的方式，`docker compose` 會自動讀取同目錄下的 `.env`。這個檔案是機器相關的，不會被 commit 進 git。）

## 步驟 4：build 並啟動兩個 container

```bash
cd ~/Project/snn-academy
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

- `--build`：先照 `Dockerfile` build `docs` 這個 image（含 `npm run docs:build`），再啟動。
- `-d`：背景執行。

## 步驟 5：確認狀態

```bash
docker compose -f deploy/docker/docker-compose.yml ps
docker compose -f deploy/docker/docker-compose.yml logs cloudflared --tail 30
```

`docs` 跟 `cloudflared` 應該都是 `Up` 的狀態，`cloudflared` 的 log 裡應該會看到幾行 `Registered tunnel connection`（代表成功連上 Cloudflare）。

## 步驟 6：驗證

跟之前一樣，瀏覽器或用 `curl` 打 `https://snn.salt-shio.win`，能看到 200 就代表成功切換到 Docker 版本了。

## 內容更新後怎麼處理

```bash
cd ~/Project/snn-academy
git pull
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

`--build` 會重新跑一次 `Dockerfile`（也就是重新 `npm run docs:build`），`up -d` 只會重建有變動的 container（`docs`），`cloudflared` 不會被動到。

## 服務管理常用指令

```bash
# 看目前狀態
docker compose -f deploy/docker/docker-compose.yml ps

# 看 log
docker compose -f deploy/docker/docker-compose.yml logs -f docs
docker compose -f deploy/docker/docker-compose.yml logs -f cloudflared

# 停止（container 還在，只是不跑）
docker compose -f deploy/docker/docker-compose.yml stop

# 啟動
docker compose -f deploy/docker/docker-compose.yml start

# 整個拆掉（container 砍掉，image 保留）
docker compose -f deploy/docker/docker-compose.yml down
```

`restart: unless-stopped` 已經設定好，機器重開機、container 意外掛掉都會自動重啟，不需要額外設 systemd。

## 確認舊的 systemd 版本真的沒在跑

避免兩邊搶同一個 tunnel（一個 tunnel 理論上不該同時被兩個地方連），Docker 版本確認正常之後，systemd 那兩個服務就保持 disabled 就好，不用刪除，留著當作之後想切回去的備案。
