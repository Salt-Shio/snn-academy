#!/usr/bin/env bash
# 在「遠端機器」上執行：拉最新內容、重新 build、重啟文件伺服器。
# 前提：deploy/remote_install_systemd.sh 已經跑過，服務已經是 systemd 常駐。
# 用法：cd snn-academy && ./deploy/remote_update.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "==> git pull"
git pull

echo "==> npm install（相依套件若有變動才會實際安裝）"
npm install

echo "==> 重新 build"
npm run docs:build

echo "==> 重啟文件伺服器服務"
sudo systemctl restart snn-academy-docs.service

echo "==> 完成，服務狀態："
sudo systemctl --no-pager status snn-academy-docs.service
