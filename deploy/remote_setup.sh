#!/usr/bin/env bash
# 在「遠端 Debian/Ubuntu 機器」上執行的一次性初始設置。
# 前提：已經在遠端機器上 git clone 這個 repo，並且在 repo 根目錄下執行本腳本。
# 用法：cd snn-academy && ./deploy/remote_setup.sh
#
# 這個腳本只處理「安裝相依套件 + 第一次 build」，不處理 cloudflared tunnel
# 憑證與 systemd 常駐設定，那兩步驟見 deploy/Deploy_Remote_Systemd.md。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
  echo "找不到 package.json，請確認在 repo 根目錄下執行 ./deploy/remote_setup.sh" >&2
  exit 1
fi

echo "==> 安裝基本工具 (curl, git, ca-certificates, gnupg)"
sudo apt-get update
sudo apt-get install -y curl git ca-certificates gnupg

echo "==> 檢查 Node.js"
if command -v node >/dev/null 2>&1; then
  echo "已安裝 node $(node --version)，略過安裝"
else
  echo "==> 安裝 Node.js LTS（NodeSource 官方腳本）"
  curl -fsSL https://deb.nodesource.com/setup_lts.x -o /tmp/nodesource_setup.sh
  sudo -E bash /tmp/nodesource_setup.sh
  sudo apt-get install -y nodejs
  rm -f /tmp/nodesource_setup.sh
fi

echo "==> 檢查 cloudflared"
if command -v cloudflared >/dev/null 2>&1; then
  echo "已安裝 cloudflared $(cloudflared --version)，略過安裝"
else
  echo "==> 安裝 cloudflared（Cloudflare 官方 apt repo）"
  sudo mkdir -p --mode=0755 /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
  echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
  sudo apt-get update
  sudo apt-get install -y cloudflared
fi

echo "==> 安裝 npm 套件並 build 文件站"
cd "$PROJECT_ROOT"
npm install
npm run docs:build

cat <<EOF

==> 基礎環境設置完成。

接下來（見 deploy/Deploy_Remote_Systemd.md）：
  1. 從本機把 tunnel 憑證 scp 過來（~/.cloudflared/<TUNNEL_ID>.json）
  2. 在這台機器上建立 ~/.cloudflared/config.yml
  3. 執行 ./deploy/remote_install_systemd.sh 設定常駐服務
EOF
