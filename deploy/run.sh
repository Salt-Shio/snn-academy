#!/usr/bin/env bash
# 一次性測試部署：build 文件站 -> 啟動本機伺服器 -> 啟動 Cloudflare Tunnel。
# 用法：在自己的終端機執行 ./deploy/run.sh（前景執行），Ctrl+C 會一併關閉本機伺服器與 tunnel。
# 背景說明見 ./deploy/Deploy_CloudflareTunnel.md。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONDA_ENV_BIN="/home/salt/.conda/envs/snn-academy/bin"
TUNNEL_NAME="snn-academy-tunnel"
PREVIEW_PORT=4173

if [[ ! -x "$CONDA_ENV_BIN/npm" ]]; then
  echo "找不到 conda snn-academy 環境的 npm：$CONDA_ENV_BIN/npm" >&2
  exit 1
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "找不到 cloudflared，先執行 sudo pacman -S cloudflared" >&2
  exit 1
fi

export PATH="$CONDA_ENV_BIN:$PATH"
cd "$PROJECT_ROOT"

echo "==> 建置文件站 (npm run docs:build)"
npm run docs:build

PREVIEW_PID=""
TUNNEL_PID=""

cleanup() {
  echo "==> 關閉服務中..."
  [[ -n "$PREVIEW_PID" ]] && kill "$PREVIEW_PID" 2>/dev/null || true
  [[ -n "$TUNNEL_PID" ]] && kill "$TUNNEL_PID" 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "==> 啟動本機伺服器 (npm run docs:preview, port $PREVIEW_PORT)"
npm run docs:preview &
PREVIEW_PID=$!

echo "==> 等待本機伺服器就緒"
for _ in $(seq 1 20); do
  if curl -s -o /dev/null "http://localhost:$PREVIEW_PORT"; then
    break
  fi
  sleep 0.5
done

echo "==> 啟動 Cloudflare Tunnel ($TUNNEL_NAME)"
cloudflared tunnel run "$TUNNEL_NAME" &
TUNNEL_PID=$!

echo "==> 服務已啟動，按 Ctrl+C 可同時關閉本機伺服器與 tunnel"
wait
