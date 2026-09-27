-- Proveedores, lotes, apertura y costo de pieza (ticket #8, ADR 0001).
-- Toda pieza registra su procedencia: por un lote (con reparto de costo) o
-- por una compra a particular (con costo directo). Los descartes de un lote
-- nunca generan fila de "pieza", así que nunca reciben parte del costo.

-- CreateEnum
CREATE TYPE "CanalDeAbastecimiento" AS ENUM ('FARDO_CERRADO', 'LOTE_CLASIFICADO', 'LOTE_SELECCIONADO');

-- CreateEnum
CREATE TYPE "Condicion" AS ENUM ('EXCELENTE', 'MUY_BUENA', 'BUENA', 'CON_DETALLES');

-- CreateTable
CREATE TABLE "proveedor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calidad_declarada" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "calidad_declarada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lote" (
    "id" SERIAL NOT NULL,
    "proveedor_id" INTEGER NOT NULL,
    "canal" "CanalDeAbastecimiento" NOT NULL,
    "calidad_declarada_id" INTEGER NOT NULL,
    "costo_centavos" INTEGER NOT NULL,
    "transporte_centavos" INTEGER NOT NULL DEFAULT 0,
    "fecha_compra" TIMESTAMP(3) NOT NULL,
    "fecha_recepcion" TIMESTAMP(3),
    "fecha_apertura" TIMESTAMP(3),
    "unidades_recibidas" INTEGER,
    "descartes" INTEGER,
    "nota_apertura" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lote_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "pieza" ADD COLUMN     "lote_id" INTEGER,
ADD COLUMN     "proveedor_id" INTEGER,
ADD COLUMN     "costo_directo_centavos" INTEGER,
ADD COLUMN     "costo_reacondicionamiento_centavos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "condicion_ingreso" "Condicion";

-- CreateIndex
CREATE UNIQUE INDEX "calidad_declarada_nombre_key" ON "calidad_declarada"("nombre");

-- CreateIndex
CREATE INDEX "lote_proveedor_id_idx" ON "lote"("proveedor_id");

-- CreateIndex
CREATE INDEX "pieza_lote_id_idx" ON "pieza"("lote_id");

-- CreateIndex
CREATE INDEX "pieza_proveedor_id_idx" ON "pieza"("proveedor_id");

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lote" ADD CONSTRAINT "lote_calidad_declarada_id_fkey" FOREIGN KEY ("calidad_declarada_id") REFERENCES "calidad_declarada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_lote_id_fkey" FOREIGN KEY ("lote_id") REFERENCES "lote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Valores iniciales de la calidad declarada (la operadora puede sumar más).
INSERT INTO "calidad_declarada" ("nombre") VALUES
  ('Primera'), ('Segunda'), ('Tercera');
