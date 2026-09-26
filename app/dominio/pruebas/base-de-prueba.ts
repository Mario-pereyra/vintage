import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";

import { PrismaClient } from "~/generated/prisma/client";

import { crearDominio, type Dominio } from "../index";

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
  cerrar(): Promise<void>;
}

/**
 * Crea una base Postgres limpia (PGlite) con el esquema y las migraciones
 * reales, y el módulo de dominio conectado a ella. Úsala en `beforeEach`.
 */
export async function crearBaseDePrueba(): Promise<BaseDePrueba> {
  // `clone()` devuelve otra instancia de PGlite, aunque su tipo sea la interfaz.
  const pg = (await (await plantillaMigrada()).clone()) as PGlite;
  const prisma = new PrismaClient({ adapter: new PrismaPGlite(pg) });

  return {
    dominio: crearDominio(prisma),
    async cerrar() {
      await prisma.$disconnect();
      await pg.close();
    },
  };
}
