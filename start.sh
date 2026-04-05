#!/usr/bin/env bash
# SalveFacil — chama update.sh (git, npm, Prisma) e em seguida sobe API + Web
# Uso: chmod +x start.sh && ./start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPDATE_SH="$ROOT/update.sh"

echo ""
echo "=== SalveFacil — iniciar aplicação ==="
echo "Pasta do projeto: $ROOT"
echo ""
echo "[1/2] Atualizando repositório e dependências (update.sh)..."
export SALVEFACIL_FROM_START=1
if [[ -x "$UPDATE_SH" ]]; then
  "$UPDATE_SH"
else
  bash "$UPDATE_SH"
fi

open_browser() {
  local url="${1:-http://localhost:4000}"
  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" &>/dev/null || true
  elif command -v open &>/dev/null; then
    open "$url" || true
  else
    echo "Abra no navegador: $url"
  fi
}

start_servers_in_terminals() {
  if [[ "$(uname -s)" == "Darwin" ]] && command -v osascript &>/dev/null; then
    osascript <<EOF
tell application "Terminal"
  do script "cd \"$ROOT/api\" && npm run start:dev"
  do script "cd \"$ROOT/web\" && npm run dev"
end tell
EOF
    return 0
  fi

  if [[ -n "${DISPLAY:-}" ]] || [[ "$(uname -s)" == "Darwin" ]]; then
    :
  else
    return 1
  fi

  if command -v gnome-terminal &>/dev/null; then
    gnome-terminal -- bash -c "cd \"$ROOT/api\" && npm run start:dev; exec bash" &
    gnome-terminal -- bash -c "cd \"$ROOT/web\" && npm run dev; exec bash" &
    return 0
  fi
  if command -v konsole &>/dev/null; then
    konsole -e bash -c "cd \"$ROOT/api\" && npm run start:dev; exec bash" &
    konsole -e bash -c "cd \"$ROOT/web\" && npm run dev; exec bash" &
    return 0
  fi
  if command -v xterm &>/dev/null; then
    xterm -e "cd \"$ROOT/api\" && npm run start:dev; bash" &
    xterm -e "cd \"$ROOT/web\" && npm run dev; bash" &
    return 0
  fi

  return 1
}

start_servers_background() {
  echo "Iniciando API e Web em segundo plano neste terminal (Ctrl+C encerra ambos)..."
  trap 'kill $(jobs -p) 2>/dev/null || true' EXIT INT TERM
  (cd "$ROOT/api" && npm run start:dev) &
  (cd "$ROOT/web" && npm run dev) &
  sleep 4
  open_browser "http://localhost:4000"
  PORT_HINT="$(grep -E '^PORT=' "$ROOT/api/.env" 2>/dev/null | cut -d= -f2- | tr -d '\"' || true)"
  PORT_HINT="${PORT_HINT:-3000}"
  echo ""
  echo "API: http://localhost:${PORT_HINT} (ou conforme PORT em api/.env)"
  echo "Web: http://localhost:4000 (fixo nos scripts npm)"
  echo "Pressione Ctrl+C para parar API e Web."
  wait
}

echo ""
echo "[2/2] Iniciando API e Web..."
PORT_HINT="$(grep -E '^PORT=' "$ROOT/api/.env" 2>/dev/null | cut -d= -f2- | tr -d '\"' || true)"
PORT_HINT="${PORT_HINT:-3000}"

if start_servers_in_terminals; then
  echo ""
  echo "Aguardando o Next iniciar (~4 s)..."
  sleep 4
  open_browser "http://localhost:4000"
  echo ""
  echo "API: http://localhost:${PORT_HINT} (ou PORT em api/.env)"
  echo "Web: http://localhost:4000 (fixo nos scripts npm)"
  echo "Feche as janelas do terminal dos servidores para parar."
  exit 0
fi

start_servers_background
