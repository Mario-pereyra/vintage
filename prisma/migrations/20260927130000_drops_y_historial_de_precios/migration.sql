-- Drops y historial de precios (ticket #12).
-- Un drop agrupa piezas En preparación para publicarlas juntas o de a poco; el
-- historial guarda cada precio publicado que tuvo una pieza y desde cuándo.

-- CreateTable
CREATE TABLE "drop" (
    "id" SERIAL NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_precio" (
    "id" UUID NOT NULL,
    "pieza_id" UUID NOT NULL,
    "precio_centavos" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "historial_precio_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "pieza" ADD COLUMN     "drop_id" INTEGER;

-- CreateIndex
CREATE INDEX "historial_precio_pieza_id_fecha_idx" ON "historial_precio"("pieza_id", "fecha");

-- CreateIndex
CREATE INDEX "pieza_drop_id_idx" ON "pieza"("drop_id");

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_drop_id_fkey" FOREIGN KEY ("drop_id") REFERENCES "drop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_precio" ADD CONSTRAINT "historial_precio_pieza_id_fkey" FOREIGN KEY ("pieza_id") REFERENCES "pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
