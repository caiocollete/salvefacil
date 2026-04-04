# SalveFacil

Aplicação **CRUD** para cadastro de **clientes**, **produtos** e **pedidos**, com **fechamento** (relatórios por período). O objetivo do projeto é ser um sistema **simples e offline**, pensado para uso em **rede local** ou na própria máquina — **não** é uma plataforma multiusuário na internet: não há login nem isolamento por tenant; a API e o banco ficam acessíveis onde você instalar.

---

## Pré-requisitos

| Requisito | Detalhes |
|-----------|----------|
| **Node.js** | Versão **24** (intervalo `>=24 <25`, ver `.nvmrc`). |
| **PostgreSQL** | Banco acessível pela URL em `DATABASE_URL` (local, Docker ou outro host na rede). |
| **Git** | Opcional; usado pelo `dev-local.bat` para atualizar o repositório antes de subir o ambiente. |

No **Windows**, o script `dev-local.bat` na raiz pode instalar o Node 24 (via `winget` ou instalador) se ainda não existir.

---

## Estrutura do monorepo

| Pasta | Conteúdo |
|-------|----------|
| `api/` | API **NestJS** + **Prisma** (PostgreSQL). |
| `web/` | Interface **Next.js** (porta fixa **4000** em dev/produção local). |

Não há `package.json` na raiz: instale e rode **dentro** de `api/` e `web/`.

---

## Configuração rápida

### 1. API (`api/`)

```bash
cd api
cp .env.example .env
```

Edite `api/.env`: `DATABASE_URL`, `WEB_ORIGIN` (origem do front, ex.: `http://localhost:4000`) e, se quiser, `PORT` (padrão **3000** se omitido).

```bash
npx prisma migrate deploy
npm install
npm run start:dev
```

### 2. Web (`web/`)

```bash
cd web
cp .env.example .env.local
```

Ajuste `NEXT_PUBLIC_API_URL` / `API_URL` para a URL da API (ex.: `http://localhost:3000` se a API usar a porta padrão).

```bash
npm install
npm run dev
```

Abra **http://localhost:4000** no navegador.

### 3. Windows — tudo de uma vez

Execute `dev-local.bat` na raiz do repositório: atualiza o Git (`fetch` + `pull`), instala dependências, roda Prisma quando houver `api/.env` e abre a API e o front em janelas separadas, depois o navegador em `http://localhost:4000`.

---

## Portas usuais (desenvolvimento local)

- **Front (Next):** `4000` (definido nos scripts `npm run dev` / `npm run start` em `web/package.json`).
- **API (Nest):** `3000` por padrão, ou o valor de `PORT` em `api/.env`.

---

## Documentação adicional

- Requisitos de negócio: `requirements.md`
- Contexto técnico para agentes/IA: `CLAUDE.md`, `AGENTS.md`
