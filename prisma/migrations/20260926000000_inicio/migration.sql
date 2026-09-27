-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EstadoPieza" AS ENUM ('EN_PREPARACION', 'DISPONIBLE', 'RESERVADA', 'VENDIDA', 'RETIRADA');

-- CreateTable
CREATE TABLE "pieza" (
    "id" UUID NOT NULL,
    "estado" "EstadoPieza" NOT NULL DEFAULT 'EN_PREPARACION',
    "publicada_en" TIMESTAMP(3),
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieza_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pieza_estado_publicada_en_idx" ON "pieza"("estado", "publicada_en");
