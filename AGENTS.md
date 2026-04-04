# Instruções para agentes (Cursor / automação)

Leia este arquivo antes de alterar o repositório. Detalhes de produto e arquitetura: **`CLAUDE.md`**. Requisitos originais: **`requirements.md`**.

---

## Regras de ouro

1. **Sem tenants:** não há `userId`; dados são globais. Novos endpoints não devem reintroduzir escopo por usuário sem decisão explícita de produto.
2. **Prisma 7:** não adicionar `url` no `schema.prisma`. Migrate usa `prisma.config.ts`. Runtime: `PrismaService` com **`PrismaPg`** + `DATABASE_URL` via `ConfigService`.
3. **Monorepo:** mudanças na API ficam em `api/`; na UI em `web/`. Não assumir workspace npm na raiz.
4. **Node.js:** versão **24** (intervalo `>=24 <25` em `package.json` de `api/` e `web/`; `.nvmrc` na raiz).

---

## Comandos (executar no diretório certo)

### API (`api/`)

```bash
npm install
npx prisma generate
npx prisma migrate dev      # após mudar schema em desenvolvimento
npm run start:dev
npm run build
npm run lint
```

### Web (`web/`)

```bash
npm install
npm run dev
npm run build
npm run lint
```

---

## Variáveis de ambiente

### `api/.env` (ver `api/.env.example`)

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Postgres (adapter no runtime; migrate via `prisma.config.ts`) |
| `PORT` | Padrão **3001** na API se omitido (`main.ts`). Next usa **4000** nos scripts `dev`/`start`. |
| `WEB_ORIGIN` | CORS na **API**; URL(s) do front |

### `web/.env.local` (ver `web/.env.example`)

| Variável | Uso |
|----------|-----|
| `NEXT_PUBLIC_API_URL` | Opcional: URL direta da API no browser (precisa existir no build) |
| `API_URL` | URL da API no build (rewrites servidor → `/api-backend/*`) |

---

## Onde editar o quê

| Tarefa | Local |
|--------|--------|
| Modelo / migração | `api/prisma/schema.prisma`, nova pasta em `api/prisma/migrations/` |
| Nova rota | Controller do módulo + service |
| DTO / validação | `api/src/**/dto/*.ts` |
| Página ou layout UI | `web/src/app/**` |
| Estilo global / date input | `web/src/app/globals.css`, `web/src/app/layout.tsx` (`className="dark"` no `html`) |
| Cliente HTTP | `web/src/lib/api.ts` |

---

## Padrões já usados na API

- **`configureApp`:** pipes de validação + CORS (`api/src/configure-app.ts`) — usado por `main.ts`.
- **Pedidos:** criação/atualização em transação; `orderNumber` único global; itens com snapshot de `unitPrice`.
- **Relatórios:** agregam todos os pedidos no período.

---

## Padrões já usados na Web

- **`AppShell`:** navegação lateral.
- **`apiFetch`:** JSON para a API.
- **Formatação CPF/CNPJ:** apenas em `clientes/page.tsx`; payload = dígitos apenas.

---

## Verificação antes de concluir tarefa

- [ ] `npm run build` em `api/` e `web/` sem erro (com `DATABASE_URL` na API se o build depender do Prisma).
- [ ] Não commitar `.env` (já no `.gitignore` dos apps).

---

## Glossário rápido

- **PF/PJ:** enum `PersonType` no Prisma.
- **Fechamento:** relatórios em `/reports/*` (fechamento = recibo por linha de item + sumários).
- **Keep-alive DB:** agendar `GET /health/db` (público) para ping no Postgres.
