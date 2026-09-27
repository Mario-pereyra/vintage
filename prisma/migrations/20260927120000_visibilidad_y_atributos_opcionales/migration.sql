-- Visibilidad por campo y atributos opcionales de la pieza (ticket #6).
-- La operadora carga condición, nota de condición, marca y autenticidad,
-- cierre, interior, color de herrajes, "Incluye", "Qué cabe" y descripción, y
-- decide con un interruptor por campo cuáles se publican. Marca y
-- autenticidad comparten un solo interruptor (ADR 0002); descripción no tiene
-- interruptor, se publica siempre que exista.

-- CreateEnum
CREATE TYPE "Autenticidad" AS ENUM ('COMPROBADA', 'ATRIBUIDA');

-- CreateTable
CREATE TABLE "marca" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "marca_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "marca_nombre_key" ON "marca"("nombre");

-- AlterTable
ALTER TABLE "pieza" ADD COLUMN     "condicion" "Condicion",
ADD COLUMN     "visible_condicion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nota_condicion" TEXT,
ADD COLUMN     "visible_nota_condicion" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "marca_id" INTEGER,
ADD COLUMN     "autenticidad" "Autenticidad",
ADD COLUMN     "visible_marca" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cierre" TEXT,
ADD COLUMN     "visible_cierre" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "interior" TEXT,
ADD COLUMN     "visible_interior" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "color_herrajes" TEXT,
ADD COLUMN     "visible_herrajes" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "incluye" TEXT,
ADD COLUMN     "visible_incluye" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "que_cabe" TEXT,
ADD COLUMN     "visible_que_cabe" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "descripcion" TEXT;

-- CreateIndex
CREATE INDEX "pieza_marca_id_idx" ON "pieza"("marca_id");

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_marca_id_fkey" FOREIGN KEY ("marca_id") REFERENCES "marca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Valores iniciales de marca (la operadora puede sumar más desde el panel).
INSERT INTO "marca" ("nombre") VALUES
  ('Guess'), ('Michael Kors'), ('Coach'), ('Kate Spade'), ('Tommy Hilfiger');
