-- Ventas con pago verificado, entregas y retiros (ticket #10).
-- Aditiva: crea tipos, tablas e índices nuevos y suma PAGADA a EstadoReserva.

-- CreateEnum
CREATE TYPE "CanalDeCaptacion" AS ENUM ('TIKTOK_PUBLICACION', 'TIKTOK_LIVE', 'INSTAGRAM_PUBLICACION', 'INSTAGRAM_LIVE', 'FACEBOOK_PUBLICACION', 'FACEBOOK_LIVE', 'WEB', 'RECOMENDACION');

-- CreateEnum
CREATE TYPE "ModalidadDeEntrega" AS ENUM ('RETIRO', 'DELIVERY_SANTA_CRUZ', 'ENVIO_DEPARTAMENTO');

-- CreateEnum
CREATE TYPE "EstadoEntrega" AS ENUM ('PENDIENTE', 'ENTREGADA');

-- CreateEnum
CREATE TYPE "MotivoDeRetiro" AS ENUM ('IRRECUPERABLE', 'DEVUELTA_AL_PROVEEDOR', 'USO_PROPIO', 'OTRO');

-- AlterEnum
ALTER TYPE "EstadoReserva" ADD VALUE 'PAGADA';

-- CreateTable
CREATE TABLE "venta" (
    "id" UUID NOT NULL,
    "pieza_id" UUID NOT NULL,
    "compradora_id" UUID NOT NULL,
    "reserva_id" UUID,
    "precio_final_centavos" INTEGER NOT NULL,
    "vendida_en" TIMESTAMP(3) NOT NULL,
    "canal" "CanalDeCaptacion" NOT NULL,
    "pago_verificado_en" TIMESTAMP(3) NOT NULL,
    "modalidad_de_entrega" "ModalidadDeEntrega" NOT NULL,
    "costo_entrega_centavos" INTEGER NOT NULL,
    "estado_de_entrega" "EstadoEntrega" NOT NULL DEFAULT 'PENDIENTE',
    "guia" TEXT,
    "entregada_en" TIMESTAMP(3),
    "creada_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retiro" (
    "id" UUID NOT NULL,
    "pieza_id" UUID NOT NULL,
    "motivo" "MotivoDeRetiro" NOT NULL,
    "nota" TEXT,
    "retirada_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retiro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "venta_pieza_id_key" ON "venta"("pieza_id");

-- CreateIndex
CREATE UNIQUE INDEX "venta_reserva_id_key" ON "venta"("reserva_id");

-- CreateIndex
CREATE INDEX "venta_estado_de_entrega_vendida_en_idx" ON "venta"("estado_de_entrega", "vendida_en");

-- CreateIndex
CREATE INDEX "venta_vendida_en_idx" ON "venta"("vendida_en");

-- CreateIndex
CREATE INDEX "venta_compradora_id_idx" ON "venta"("compradora_id");

-- CreateIndex
CREATE UNIQUE INDEX "retiro_pieza_id_key" ON "retiro"("pieza_id");

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_pieza_id_fkey" FOREIGN KEY ("pieza_id") REFERENCES "pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_compradora_id_fkey" FOREIGN KEY ("compradora_id") REFERENCES "compradora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta" ADD CONSTRAINT "venta_reserva_id_fkey" FOREIGN KEY ("reserva_id") REFERENCES "reserva"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retiro" ADD CONSTRAINT "retiro_pieza_id_fkey" FOREIGN KEY ("pieza_id") REFERENCES "pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Montos acotados también en la base (el dominio los valida antes).
ALTER TABLE "venta" ADD CONSTRAINT "venta_precio_final_positivo" CHECK ("precio_final_centavos" > 0);
ALTER TABLE "venta" ADD CONSTRAINT "venta_costo_entrega_no_negativo" CHECK ("costo_entrega_centavos" >= 0);
