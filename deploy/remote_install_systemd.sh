#!/usr/bin/env bash
# 在「遠端機器」上執行：把文件伺服器 + cloudflared tunnel 設成 systemd 常駐服務。
# 前提：
#   1. 已經跑過 ./deploy/remote_setup.sh（node/npm/cloudflared 都裝好、repo 已 build）
#   2. ~/.cloudflared/ 底下已經有 tunnel 的 credentials json（從本機 scp 過來）
#   3. ~/.cloudflared/config.yml 已經寫好（見 deploy/Deploy_Remote_Systemd.md）
#
# 用法：cd snn-academy && ./deploy/remote_install_systemd.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEPLOY_USER="$(whoami)"
CONFIG_YML="$HOME/.cloudflared/config.yml"

if [[ ! -f "$CONFIG_YML" ]]; then
  echo "找不到 $CONFIG_YML，先照 deploy/Deploy_Remote_Systemd.md 建立好再跑這個腳本。" >&2
  exit 1
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
CLOUDFLARED_BIN="$(command -v cloudflared || true)"

if [[ -z "$NODE_BIN" || -z "$NPM_BIN" ]]; then
  echo "找不到 node/npm，先跑 ./deploy/remote_setup.sh。" >&2
  exit 1
fi
if [[ -z "$CLOUDFLARED_BIN" ]]; then
  echo "找不到 cloudflared，先跑 ./deploy/remote_setup.sh。" >&2
  exit 1
fi

echo "==> 產生 snn-academy-docs.service"
sudo tee /etc/systemd/system/snn-academy-docs.service >/dev/null <<EOF
[Unit]
Description=SNN Academy VitePress static preview server
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
WorkingDirectory=$PROJECT_ROOT
ExecStart=$NPM_BIN run docs:preview
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> 產生 snn-academy-tunnel.service"
sudo tee /etc/systemd/system/snn-academy-tunnel.service >/dev/null <<EOF
[Unit]
Description=Cloudflare Tunnel for SNN Academy docs
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$DEPLOY_USER
ExecStart=$CLOUDFLARED_BIN tunnel --config $CONFIG_YML run
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> 啟用並啟動服務"
sudo systemctl daemon-reload
sudo systemctl enable --now snn-academy-docs.service
sudo systemctl enable --now snn-academy-tunnel.service

echo "==> 服務狀態"
sudo systemctl --no-pager status snn-academy-docs.service snn-academy-tunnel.service
