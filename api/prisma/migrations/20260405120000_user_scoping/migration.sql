-- Escopo por usuário: dados existentes são atribuídos ao primeiro usuário (por created_at).
-- Linhas órfãs (sem usuário no banco) são removidas.

DROP INDEX IF EXISTS "clients_document_key";
DROP INDEX IF EXISTS "orders_order_number_key";

ALTER TABLE "clients" ADD COLUMN "user_id" TEXT;
ALTER TABLE "products" ADD COLUMN "user_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "user_id" TEXT;

UPDATE "clients"
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1)
WHERE "user_id" IS NULL
  AND EXISTS (SELECT 1 FROM "users");

UPDATE "products"
SET "user_id" = (SELECT "id" FROM "users" ORDER BY "created_at" ASC LIMIT 1)
WHERE "user_id" IS NULL
  AND EXISTS (SELECT 1 FROM "users");

UPDATE "orders" o
SET "user_id" = c."user_id"
FROM "clients" c
WHERE o."client_id" = c."id"
  AND o."user_id" IS NULL
  AND c."user_id" IS NOT NULL;

DELETE FROM "order_items"
WHERE "order_id" IN (SELECT "id" FROM "orders" WHERE "user_id" IS NULL);

DELETE FROM "orders" WHERE "user_id" IS NULL;
DELETE FROM "products" WHERE "user_id" IS NULL;
DELETE FROM "clients" WHERE "user_id" IS NULL;

ALTER TABLE "clients" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "products" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "user_id" SET NOT NULL;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
  ADD CONSTRAINT "products_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "clients_user_id_idx" ON "clients"("user_id");
CREATE INDEX "products_user_id_idx" ON "products"("user_id");
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");

CREATE UNIQUE INDEX "clients_user_id_document_key" ON "clients"("user_id", "document");
CREATE UNIQUE INDEX "orders_user_id_order_number_key" ON "orders"("user_id", "order_number");
