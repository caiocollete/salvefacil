-- CreateEnum
CREATE TYPE "ClientClassification" AS ENUM ('PEQUENO', 'MEDIO', 'GRANDE');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN "classification" "ClientClassification" NOT NULL DEFAULT 'MEDIO';
