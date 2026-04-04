-- Remove autenticação (users) e escopo por tenant (user_id).
-- Zera dados de negócio: documento e número de pedido passam a ser únicos globalmente.

BEGIN;

TRUNCATE TABLE "order_items", "orders", "products", "clients" CASCADE;

ALTER TABLE "clients" DROP CONSTRAINT IF EXISTS "clients_user_id_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_user_id_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_user_id_fkey";

DROP INDEX IF EXISTS "clients_user_id_idx";
DROP INDEX IF EXISTS "products_user_id_idx";
DROP INDEX IF EXISTS "orders_user_id_idx";
DROP INDEX IF EXISTS "clients_user_id_document_key";
DROP INDEX IF EXISTS "orders_user_id_order_number_key";

ALTER TABLE "clients" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "products" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "orders" DROP COLUMN IF EXISTS "user_id";

CREATE UNIQUE INDEX IF NOT EXISTS "clients_document_key" ON "clients"("document");
CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "orders"("order_number");

DROP TABLE IF EXISTS "users";

COMMIT;
