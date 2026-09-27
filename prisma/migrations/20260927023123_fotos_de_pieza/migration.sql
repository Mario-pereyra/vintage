-- Fotos de pieza (ticket #5): las 8 tomas estandarizadas, cada una con sus
-- tres variantes (miniatura, catálogo, detalle) generadas en el navegador y
-- subidas a R2. A lo sumo una foto por tipo de toma y pieza; exactamente una
-- es la portada.

-- CreateEnum
CREATE TYPE "TipoDeToma" AS ENUM ('FRENTE', 'DORSO', 'LATERAL', 'BASE_Y_ESQUINAS', 'INTERIOR', 'HERRAJES_Y_CIERRE', 'ASAS', 'PUESTA');

-- CreateTable
CREATE TABLE "foto" (
    "id" UUID NOT NULL,
    "pieza_id" UUID NOT NULL,
    "tipo" "TipoDeToma" NOT NULL,
    "portada" BOOLEAN NOT NULL DEFAULT false,
    "clave_miniatura" TEXT NOT NULL,
    "clave_catalogo" TEXT NOT NULL,
    "clave_detalle" TEXT NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "foto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "foto_pieza_id_tipo_key" ON "foto"("pieza_id", "tipo");

-- AddForeignKey
ALTER TABLE "foto" ADD CONSTRAINT "foto_pieza_id_fkey" FOREIGN KEY ("pieza_id") REFERENCES "pieza"("id") ON DELETE CASCADE ON UPDATE CASCADE;
