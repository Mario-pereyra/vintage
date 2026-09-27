-- Reservas con plazo, compradoras e interesadas (ticket #9, ADR 0003).
-- Aditiva: solo crea tipos, tablas e índices nuevos.

-- CreateEnum
CREATE TYPE "OrigenDeReserva" AS ENUM ('LIVE', 'FUERA_DE_LIVE');

-- CreateEnum
CREATE TYPE "EstadoReserva" AS ENUM ('ACTIVA', 'VENCIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "compradora" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compradora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserva" (
    "id" UUID NOT NULL,
    "pieza_id" UUID NOT NULL,
    "compradora_id" UUID NOT NULL,
    "origen" "OrigenDeReserva" NOT NULL,
    "estado" "EstadoReserva" NOT NULL DEFAULT 'ACTIVA',
    "con_pago_previo" BOOLEAN NOT NULL DEFAULT false,
    "creada_en" TIMESTAMP(3) NOT NULL,
    "vence_en" TIMESTAMP(3) NOT NULL,
    "cancelada_en" TIMESTAMP(3),

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interesada" (
    "id" UUID NOT NULL,
    "pieza_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "nota" TEXT,
    "creada_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interesada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compradora_whatsapp_key" ON "compradora"("whatsapp");

-- CreateIndex
CREATE INDEX "reserva_estado_vence_en_idx" ON "reserva"("estado", "vence_en");

-- CreateIndex
CREATE INDEX "reserva_pieza_id_estado_idx" ON "reserva"("pieza_id", "estado");

-- CreateIndex
CREATE INDEX "reserva_compradora_id_estado_idx" ON "reserva"("compradora_id", "estado");

-- CreateIndex
CREATE INDEX "interesada_pieza_id_idx" ON "interesada"("pieza_id");

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_pieza_id_fkey" FOREIGN KEY ("pieza_id") REFERENCES "pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reserva" ADD CONSTRAINT "reserva_compradora_id_fkey" FOREIGN KEY ("compradora_id") REFERENCES "compradora"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interesada" ADD CONSTRAINT "interesada_pieza_id_fkey" FOREIGN KEY ("pieza_id") REFERENCES "pieza"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
