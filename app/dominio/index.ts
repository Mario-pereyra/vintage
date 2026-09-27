import type { PrismaClient } from "~/generated/prisma/client";

import { listarCatalogo } from "./catalogo";

/**
 * Módulo de dominio de Vintage: el único seam de prueba.
 *
 * Reúne las operaciones del negocio detrás de una interfaz pequeña. Los
 * loaders y actions de React Router validan la entrada, llaman a estas
 * operaciones y renderizan; nunca hablan con Prisma directamente.
 */
export function crearDominio(db: PrismaClient) {
  return {
    /** Piezas que ve la compradora en el listado principal, más recientes primero. */
    listarCatalogo: () => listarCatalogo(db),
  };
}

export type Dominio = ReturnType<typeof crearDominio>;

export type { PiezaEnCatalogo } from "./catalogo";
