import type { PrismaClient } from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";

/** Las listas cerradas que la operadora puede ampliar. */
export type Lista = "tipos" | "colores" | "materiales";

/** Un valor de una lista. Los colores traen además su color de muestra. */
export interface OpcionDeLista {
  id: number;
  nombre: string;
}

export interface OpcionDeColor extends OpcionDeLista {
  /** Color de muestra para el chip (`#16130f`), o `null` si no tiene. */
  muestra: string | null;
}

export interface Listas {
  tipos: OpcionDeLista[];
  colores: OpcionDeColor[];
  materiales: OpcionDeLista[];
}

/** Los valores de cada lista, en el orden en que se dieron de alta. */
export async function obtenerListas(db: PrismaClient): Promise<Listas> {
  const orden = { orderBy: { id: "asc" } } as const;
  const [tipos, colores, materiales] = await Promise.all([
    db.tipoDeCartera.findMany({ ...orden, select: { id: true, nombre: true } }),
    db.color.findMany({ ...orden, select: { id: true, nombre: true, muestra: true } }),
    db.material.findMany({ ...orden, select: { id: true, nombre: true } }),
  ]);
  return { tipos, colores, materiales };
}

/** "  riñonera  de mano" → "Riñonera de mano". */
function normalizarNombre(nombre: string): string {
  const limpio = nombre.trim().replace(/\s+/g, " ");
  return limpio.charAt(0).toLocaleUpperCase("es") + limpio.slice(1);
}

/**
 * Suma un valor a una lista. Si ya existe (sin distinguir mayúsculas),
 * devuelve el existente en lugar de duplicarlo.
 */
export async function ampliarLista(
  db: PrismaClient,
  lista: Lista,
  nombre: string,
): Promise<OpcionDeLista | OpcionDeColor> {
  const normalizado = normalizarNombre(nombre);
  if (!normalizado) {
    throw new ErrorDeDominio("datos_invalidos", "Escribe el nuevo valor.", {
      nombre: "Escribe el nuevo valor.",
    });
  }
  if (normalizado.length > 40) {
    throw new ErrorDeDominio("datos_invalidos", "El valor es demasiado largo.", {
      nombre: "Usa como máximo 40 caracteres.",
    });
  }

  const donde = { nombre: { equals: normalizado, mode: "insensitive" as const } };

  switch (lista) {
    case "tipos":
      return (
        (await db.tipoDeCartera.findFirst({ where: donde, select: { id: true, nombre: true } })) ??
        db.tipoDeCartera.create({ data: { nombre: normalizado }, select: { id: true, nombre: true } })
      );
    case "colores": {
      const campos = { id: true, nombre: true, muestra: true } as const;
      return (
        (await db.color.findFirst({ where: donde, select: campos })) ??
        db.color.create({ data: { nombre: normalizado }, select: campos })
      );
    }
    case "materiales":
      return (
        (await db.material.findFirst({ where: donde, select: { id: true, nombre: true } })) ??
        db.material.create({ data: { nombre: normalizado }, select: { id: true, nombre: true } })
      );
  }
}
