#!/usr/bin/env bash
# Supervised Cloudflare quick tunnel — auto-restarts and writes PUBLIC_URL.txt
# Note: trycloudflare.com URLs are still ephemeral (change on restart).
# For a truly durable HTTPS URL, deploy to Vercel (see docs/DEPLOY_CHECKLIST.md).
set -euo pipefail

PORT="${1:-3000}"
LOG="/tmp/sustained-tunnel.log"
URL_FILE="${PUBLIC_URL_FILE:-$(pwd)/PUBLIC_URL.txt}"
ENV_FILE="${ENV_FILE:-$(pwd)/.env}"
BIN="${CLOUDFLARED_BIN:-/tmp/cloudflared}"

if [[ ! -x "$BIN" ]]; then
  echo "Downloading cloudflared..."
  curl -fsSL -o "$BIN" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "$BIN"
fi

pkill -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" 2>/dev/null || true
sleep 1

echo "Starting sustained cloudflared supervisor on :${PORT}" | tee "$LOG"

while true; do
  echo "---- $(date -u +%Y-%m-%dT%H:%M:%SZ) launching tunnel ----" | tee -a "$LOG"
  stdbuf -oL "$BIN" tunnel --url "http://127.0.0.1:${PORT}" --no-autoupdate 2>&1 | while IFS= read -r line; do
    echo "$line" | tee -a "$LOG"
    if echo "$line" | grep -qE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com'; then
      url=$(echo "$line" | grep -oE 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | head -1)
      printf '%s\n' "$url" > "$URL_FILE"
      echo "PUBLIC_URL=$url" | tee -a "$LOG"
      if [[ -f "$ENV_FILE" ]]; then
        if grep -q '^NEXTAUTH_URL=' "$ENV_FILE"; then
          sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=${url}|" "$ENV_FILE"
        else
          echo "NEXTAUTH_URL=${url}" >> "$ENV_FILE"
        fi
      fi
    fi
  done
  echo "Tunnel exited; restarting in 3s..." | tee -a "$LOG"
  sleep 3
done
