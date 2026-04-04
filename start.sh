#!/usr/bin/env bash
# SalveFacil — ambiente local (equivalente a start.bat no Windows)
# Uso: chmod +x start.sh && ./start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_ORIGIN_URL="${GIT_ORIGIN_URL:-https://github.com/caiocollete/salvefacil}"

echo ""
echo "=== SalveFacil — ambiente local ==="
echo "Pasta do projeto: $ROOT"
echo ""

git_sync() {
  if ! command -v git &>/dev/null; then
    echo "Git não encontrado no PATH. Pulando atualização do repositório."
    echo "Instale o Git: https://git-scm.com/downloads"
    echo "Repositório oficial: $GIT_ORIGIN_URL"
    echo "Para clonar em outra pasta: git clone $GIT_ORIGIN_URL"
    return 0
  fi
  cd "$ROOT"
  if [[ ! -d .git ]]; then
    echo "Pasta .git não encontrada. Pulando fetch/pull."
    echo "Repositório oficial: $GIT_ORIGIN_URL"
    return 0
  fi
  if ! git remote 2>/dev/null | grep -q .; then
    echo "Nenhum remote Git configurado. Adicionando origin: $GIT_ORIGIN_URL"
    git remote add origin "$GIT_ORIGIN_URL" || {
      echo "Falha ao adicionar remote origin."
      return 1
    }
  fi
  echo "[1/5] Git: fetch e pull (branch atual alinhada ao remoto)..."
  git fetch --all --prune || {
    echo "Falha em git fetch. Verifique rede, VPN ou permissão no repositório."
    return 1
  }
  if git pull; then
    return 0
  fi
  git pull -u origin main 2>/dev/null || git pull -u origin master 2>/dev/null || {
    echo "Falha em git pull. Ajuste o upstream (ex.: git branch -u origin/main) ou resolva conflitos."
    return 1
  }
  return 0
}

ensure_node_24() {
  try_use_node() {
    command -v node &>/dev/null && node -e "process.exit(/^v24\./.test(process.version)?0:1)" 2>/dev/null
  }

  if try_use_node; then
    echo "Usando $(node -v)"
    return 0
  fi

  if command -v node &>/dev/null; then
    echo "Node encontrado, mas a versão precisa ser 24.x (veja .nvmrc)."
  else
    echo "Node não encontrado."
  fi

  # nvm (instalação comum)
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  elif [[ -s "/usr/local/opt/nvm/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    . "/usr/local/opt/nvm/nvm.sh"
  fi

  if command -v nvm &>/dev/null; then
    echo "Instalando/usando Node 24 via nvm..."
    nvm install 24
    nvm use 24
    if try_use_node; then
      echo "Usando $(node -v)"
      return 0
    fi
  fi

  # fnm
  if command -v fnm &>/dev/null; then
    echo "Instalando/usando Node 24 via fnm..."
    fnm install 24
    fnm use 24
    eval "$(fnm env)"
    if try_use_node; then
      echo "Usando $(node -v)"
      return 0
    fi
  fi

  echo "Instale Node.js 24: https://nodejs.org/ — ou com nvm: nvm install 24 && nvm use 24"
  return 1
}

run_prisma() {
  cd "$ROOT/api" || return 1
  npx prisma generate || {
    echo "Falha: prisma generate."
    return 1
  }

  if [[ ! -f .env ]]; then
    echo "Não há api/.env — migrate ignorado. Copie api/.env.example para api/.env e configure DATABASE_URL."
    return 0
  fi

  if ! grep -q '^DATABASE_URL=' .env 2>/dev/null; then
    echo "api/.env sem DATABASE_URL — migrate deploy ignorado."
    return 0
  fi

  echo "Aplicando migrações pendentes (prisma migrate deploy)..."
  npx prisma migrate deploy || {
    echo "migrate deploy falhou (banco inacessível ou migrações novas em dev)."
    echo "Em desenvolvimento, rode manualmente: cd api && npx prisma migrate dev"
    return 1
  }
  return 0
}

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
  # macOS: Terminal.app
  if [[ "$(uname -s)" == "Darwin" ]] && command -v osascript &>/dev/null; then
    osascript <<EOF
tell application "Terminal"
  do script "cd \"$ROOT/api\" && npm run start:dev"
  do script "cd \"$ROOT/web\" && npm run dev"
end tell
EOF
    return 0
  fi

  # Linux: tentar terminais comuns
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
  echo ""
  echo "API: http://localhost:${PORT_HINT:-3000} (ou conforme PORT em api/.env; padrão Nest: 3000)"
  echo "Web: http://localhost:4000 (fixo nos scripts npm)"
  echo "Pressione Ctrl+C para parar API e Web."
  wait
}

# --- fluxo principal ---

git_sync || exit 1
ensure_node_24 || exit 1

echo "[2/5] npm install na API..."
(cd "$ROOT/api" && npm install) || {
  echo "Falha: npm install na API."
  exit 1
}

echo "[3/5] npm install na Web..."
(cd "$ROOT/web" && npm install) || {
  echo "Falha: npm install na Web."
  exit 1
}

echo "[4/5] Prisma (generate + migrate deploy se houver api/.env)..."
run_prisma || exit 1

echo "[5/5] Iniciando API e Web..."
PORT_HINT="$(grep -E '^PORT=' "$ROOT/api/.env" 2>/dev/null | cut -d= -f2- | tr -d '\"' || true)"
PORT_HINT="${PORT_HINT:-3000}"

if start_servers_in_terminals; then
  echo ""
  echo "Aguardando o Next iniciar (~4 s)..."
  sleep 4
  open_browser "http://localhost:4000"
  echo ""
  echo "API: http://localhost:${PORT_HINT} (ou PORT em api/.env; padrão Nest: 3000)"
  echo "Web: http://localhost:4000 (fixo nos scripts npm)"
  echo "Feche as janelas do terminal dos servidores para parar."
  exit 0
fi

start_servers_background
