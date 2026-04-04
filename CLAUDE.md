# SalveFacil — Contexto do projeto

Monorepo com **Next.js** (UI) e **NestJS** (API REST), **Prisma 7** + **PostgreSQL**. API **sem autenticação** (uso interno / rede confiável); um único conjunto de clientes, produtos e pedidos.

Documentação de requisitos de negócio: `requirements.md`.

---

## Estrutura de pastas

| Pasta         | Conteúdo                                                            |
| ------------- | ------------------------------------------------------------------- |
| `api/`        | NestJS 10, Prisma, CRUD, relatórios, health                         |
| `web/`        | Next.js 15 (App Router), Tailwind 4                                 |
| `api/prisma/` | `schema.prisma`, `migrations/`, `prisma.config.ts` (URL do Migrate) |

Não há `package.json` na raiz: cada app instala e roda por conta própria.

---

## Stack e versões relevantes

- **API:** NestJS, `class-validator`, **Prisma 7** com **`@prisma/adapter-pg` + `pg`** (Prisma 7 não usa mais `new PrismaClient()` só com URL no schema; URL de migrate fica em `prisma.config.ts`).
- **Web:** React 19, Next 15, Turbopack em dev/build.
- **DB:** PostgreSQL; `binaryTargets` no Prisma inclui `rhel-openssl-3.0.x` para builds Linux (CI/containers).

---

## Modelo de dados (resumo)

- **Client** — PF/PJ, nome, documento (**único global**), endereço, telefone.
- **Product** — nome, detalhes, preço.
- **Order** — `orderNumber` (**único global**), `clientId`, `shippingDate`, `total`; **OrderItem** (produto, qtd, preço unitário na linha).

Pedidos referenciam cliente e produtos existentes (validado na API).

---

## API — rotas principais

Base da API local: `http://localhost:3001` (padrão no `main.ts` se `PORT` estiver vazio). O front Next roda **sempre na porta 4000** (`web/package.json`).

| Método | Rota                                     | Descrição                                    |
| ------ | ---------------------------------------- | -------------------------------------------- |
| CRUD   | `/clients`                               | Clientes                                     |
| CRUD   | `/products`                              | Produtos                                     |
| CRUD   | `/orders`                                | Pedidos (total/itens calculados no servidor) |
| GET    | `/reports/closing?from=&to=`             | Recibo por período (data de envio)           |
| GET    | `/reports/monthly?year=`                 | Agregado mensal                              |
| GET    | `/reports/by-client?from=&to=&clientId=` | Por cliente (PF/PJ); `clientId` opcional     |
| GET    | `/health/live`                           | Liveness                                     |
| GET    | `/health/db`                             | `SELECT 1` (keep-alive do banco)             |

CORS: `WEB_ORIGIN` (lista separada por vírgula, se necessário).

---

## Prisma e ambiente

- **Schema:** `api/prisma/schema.prisma` — **não** colocar `url` no `datasource` (Prisma 7); URL para **migrate** em `api/prisma.config.ts` (`DATABASE_URL`).
- **Runtime:** `PrismaService` usa `PrismaPg` + `connectionString` do `ConfigService` (`DATABASE_URL`).
- Comandos úteis (dentro de `api/`):

```bash
npx prisma generate
npx prisma migrate dev      # desenvolvimento
npx prisma migrate deploy   # CI/produção
```

Migrações em `api/prisma/migrations/`.

---

## Frontend (web)

- `apiFetch` em `web/src/lib/api.ts` para JSON à API.
- Rotas sob `web/src/app/(app)/`: layout com **AppShell**.
- Páginas: `/clientes`, `/produtos`, `/pedidos`, `/fechamento` (raiz redireciona para `/clientes`).
- Clientes: CPF/CNPJ com máscara visual; envio à API **só com dígitos**.
- Fechamento: filtro de cliente com combobox pesquisável (nome/documento).

`NEXT_PUBLIC_API_URL` aponta para a API.

---

## Desenvolvimento local

**Terminal 1 — API**

```bash
cd api
cp .env.example .env   # preencher DATABASE_URL, WEB_ORIGIN
npx prisma migrate dev
npm run start:dev      # escuta em PORT ou 3001
```

**Terminal 2 — Web**

```bash
cd web
cp .env.example .env.local   # apontar API (ex. NEXT_PUBLIC_API_URL=http://localhost:3001)
npm run dev
```

Ajustar `WEB_ORIGIN` na API para `http://localhost:4000` (origem do Next).

---

## Arquivos de referência rápida

| Tema             | Arquivo(s)                                     |
| ---------------- | ---------------------------------------------- |
| Prisma + adapter | `api/src/prisma/prisma.service.ts`             |
| Bootstrap API    | `api/src/main.ts`, `api/src/configure-app.ts`  |
| Client HTTP      | `web/src/lib/api.ts`                           |

---

## Limitações / próximos passos possíveis

- API pública na rede: adicionar autenticação ou firewall reverso antes de expor à internet.
- Testes e2e da API assumem `DATABASE_URL` quando existir.
