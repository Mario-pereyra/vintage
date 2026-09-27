-- Pieza mínima (ticket #4): identificadores del ADR 0006, atributos siempre
-- visibles, precio publicado y listas cerradas ampliables.

-- AlterTable
-- `codigo` es SERIAL: sale de la secuencia `pieza_codigo_seq`, que nunca
-- devuelve dos veces el mismo valor (ni siquiera si la transacción falla).
ALTER TABLE "pieza" ADD COLUMN     "actualizada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "alto_cm" DOUBLE PRECISION,
ADD COLUMN     "ancho_cm" DOUBLE PRECISION,
ADD COLUMN     "caida_cm" DOUBLE PRECISION,
ADD COLUMN     "codigo" SERIAL NOT NULL,
ADD COLUMN     "color_id" INTEGER,
ADD COLUMN     "material_id" INTEGER,
ADD COLUMN     "nombre" TEXT,
ADD COLUMN     "precio_centavos" INTEGER,
ADD COLUMN     "profundidad_cm" DOUBLE PRECISION,
ADD COLUMN     "sufijo" TEXT,
ADD COLUMN     "tipo_id" INTEGER;

-- Si ya hubiera piezas, reciben un sufijo aleatorio (hexadecimal: cabe en el
-- alfabeto de sufijos) antes de volver la columna obligatoria.
UPDATE "pieza" SET "sufijo" = substr(md5(random()::text || "id"::text), 1, 6) WHERE "sufijo" IS NULL;
ALTER TABLE "pieza" ALTER COLUMN "sufijo" SET NOT NULL;

-- CreateTable
CREATE TABLE "tipo_de_cartera" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "tipo_de_cartera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "color" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "muestra" TEXT,

    CONSTRAINT "color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "material_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tipo_de_cartera_nombre_key" ON "tipo_de_cartera"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "color_nombre_key" ON "color"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "material_nombre_key" ON "material"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "pieza_codigo_key" ON "pieza"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "pieza_sufijo_key" ON "pieza"("sufijo");

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_tipo_id_fkey" FOREIGN KEY ("tipo_id") REFERENCES "tipo_de_cartera"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_color_id_fkey" FOREIGN KEY ("color_id") REFERENCES "color"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieza" ADD CONSTRAINT "pieza_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "material"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Valores iniciales de las listas (la operadora puede sumar más desde el panel).
INSERT INTO "tipo_de_cartera" ("nombre") VALUES
  ('De hombro'), ('De mano'), ('Bandolera'), ('Tote'), ('Clutch'), ('Mochila');

INSERT INTO "color" ("nombre", "muestra") VALUES
  ('Negro', '#16130f'), ('Marrón', '#6b4226'), ('Camel', '#c19a6b'),
  ('Beige', '#e8dcc4'), ('Blanco', '#ffffff'), ('Gris', '#8a8a8a'),
  ('Rojo', '#b3202a'), ('Rosa', '#e889a8'), ('Azul', '#2b3a8c'),
  ('Verde', '#3f6b3a'), ('Dorado', '#c9a227'), ('Plateado', '#c0c0c0'),
  ('Multicolor', NULL);

INSERT INTO "material" ("nombre") VALUES
  ('Cuero'), ('Cuero sintético'), ('Gamuza'), ('Charol'), ('Lona'), ('Tela'), ('Paja o rafia');
