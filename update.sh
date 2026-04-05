#!/usr/bin/env bash
# SalveFacil — atualizar repositório (fetch/pull), dependências e Prisma
# Uso: chmod +x update.sh && ./update.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GIT_ORIGIN_URL="${GIT_ORIGIN_URL:-https://github.com/caiocollete/salvefacil}"

echo ""
echo "=== SalveFacil — atualizar repositório e dependências ==="
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
  echo "[1/4] Git: fetch e pull (branch atual alinhada ao remoto)..."
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

git_sync || exit 1
ensure_node_24 || exit 1

echo "[2/4] npm install na API..."
(cd "$ROOT/api" && npm install) || {
  echo "Falha: npm install na API."
  exit 1
}

echo "[3/4] npm install na Web..."
(cd "$ROOT/web" && npm install) || {
  echo "Falha: npm install na Web."
  exit 1
}

echo "[4/4] Prisma (generate + migrate deploy se houver api/.env)..."
run_prisma || exit 1

echo ""
if [[ -z "${SALVEFACIL_FROM_START:-}" ]]; then
  echo "Pronto. Execute ./start.sh para iniciar a API e a Web (o start.sh já chama este update)."
else
  echo "Pronto. Continuando com o start..."
fi
echo ""
