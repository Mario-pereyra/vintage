import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";

import { PrismaClient, type EstadoPieza } from "~/generated/prisma/client";

import { crearDominio, type Dominio, type OpcionesDelDominio } from "../index";
import { numeroDeCodigo, sufijoAleatorio } from "../identificadores";

const carpetaDeMigraciones = join(process.cwd(), "prisma", "migrations");

/** SQL de las migraciones reales, en el orden en que Prisma las aplica. */
function leerMigraciones(): string[] {
  return readdirSync(carpetaDeMigraciones, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .sort()
    .map((nombre) =>
      readFileSync(join(carpetaDeMigraciones, nombre, "migration.sql"), "utf8"),
    );
}

/**
 * Una base de datos migrada en memoria. Se crea una sola vez por archivo de
 * prueba y se clona para cada prueba, así cada una arranca desde cero sin
 * volver a correr las migraciones.
 */
let plantilla: Promise<PGlite> | undefined;

function plantillaMigrada(): Promise<PGlite> {
  plantilla ??= (async () => {
    const pg = new PGlite();
    for (const sql of leerMigraciones()) {
      await pg.exec(sql);
    }
    return pg;
  })();
  return plantilla;
}

export interface BaseDePrueba {
  /** El módulo de dominio conectado a una base limpia y migrada. */
  dominio: Dominio;
  /**
   * Inserta una pieza directamente, sin pasar por el dominio.
   *
   * Provisorio: existe solo para los estados que todavía no tienen operación
   * (Reservada, Vendida y Retirada, tickets #9 y #10). Para En preparación y
   * Disponible, usa `crearPieza` y `publicarPieza`.
   *
   * Los datos obligatorios (nombre, tipo, color, material, medidas y precio)
   * traen un valor por defecto válido, como los tendría cualquier pieza que
   * llegó a publicarse; pásalos para probar un filtro o un dato del listado.
   * Pasar `null` explícito (a diferencia de no pasar el campo) deja la columna
   * vacía, para simular una pieza publicada con datos incompletos.
   */
  sembrarPieza(pieza: {
    estado: EstadoPieza;
    publicadaEn?: Date;
    nombre?: string | null;
    tipoId?: number | null;
    colorId?: number | null;
    materialId?: number | null;
    altoCm?: number | null;
    anchoCm?: number | null;
    profundidadCm?: number | null;
    precioCentavos?: number | null;
  }): Promise<void>;
  /**
   * Borra una pieza por fuera del dominio (el dominio nunca borra piezas), para
   * comprobar que su código no vuelve a asignarse.
   */
  borrarPiezaSinDominio(codigo: string): Promise<void>;
  cerrar(): Promise<void>;
}

/**
 * Crea una base Postgres limpia (PGlite) con el esquema y las migraciones
 * reales, y el módulo de dominio conectado a ella. Úsala en `beforeEach`.
 * Las opciones fijan el reloj, el prefijo del código o los umbrales.
 */
export async function crearBaseDePrueba(
  opciones: OpcionesDelDominio = {},
): Promise<BaseDePrueba> {
  const { prisma, cerrar } = await crearPrismaDePrueba();

  const primerId = async (
    modelo: { findFirstOrThrow: (args: { orderBy: { id: "asc" } }) => Promise<{ id: number }> },
  ) => (await modelo.findFirstOrThrow({ orderBy: { id: "asc" } })).id;

  return {
    dominio: crearDominio(prisma, opciones),
    async sembrarPieza({
      estado,
      publicadaEn,
      nombre,
      tipoId,
      colorId,
      materialId,
      altoCm,
      anchoCm,
      profundidadCm,
      precioCentavos,
    }) {
      await prisma.pieza.create({
        data: {
          id: crypto.randomUUID(),
          sufijo: sufijoAleatorio(),
          estado,
          publicadaEn,
          nombre: nombre === undefined ? "Pieza de prueba" : nombre,
          tipoId: tipoId === undefined ? await primerId(prisma.tipoDeCartera) : tipoId,
          colorId: colorId === undefined ? await primerId(prisma.color) : colorId,
          materialId: materialId === undefined ? await primerId(prisma.material) : materialId,
          altoCm: altoCm === undefined ? 20 : altoCm,
          anchoCm: anchoCm === undefined ? 20 : anchoCm,
          profundidadCm: profundidadCm === undefined ? 10 : profundidadCm,
          precioCentavos: precioCentavos === undefined ? 10000 : precioCentavos,
        },
      });
    },
    async borrarPiezaSinDominio(codigo) {
      await prisma.pieza.delete({ where: { codigo: numeroDeCodigo(codigo) ?? 0 } });
    },
    cerrar,
  };
}

/**
 * Un cliente de Prisma sobre una base limpia y migrada. Solo para probar la
 * capa de autenticación (Better Auth), que habla con Prisma directamente; las
 * pruebas del dominio usan `crearBaseDePrueba()`.
 */
export async function crearPrismaDePrueba(): Promise<{
  prisma: PrismaClient;
  cerrar(): Promise<void>;
}> {
  // `clone()` devuelve otra instancia de PGlite, aunque su tipo sea la interfaz.
  const pg = (await (await plantillaMigrada()).clone()) as PGlite;
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) });

  return {
    prisma,
    async cerrar() {
      await prisma.$disconnect();
      await pg.close();
    },
  };
}
