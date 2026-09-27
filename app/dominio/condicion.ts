import type { Condicion as CondicionDePrisma } from "~/generated/prisma/client";

/**
 * Escala fija de condición de una pieza (ver "Condición" en CONTEXT.md). La
 * condición de ingreso (asignada en la apertura de un lote o en una compra a
 * particular) usa esta misma escala; la condición de publicación (#6) la
 * reutilizará.
 */
export type CondicionDePieza = "excelente" | "muy_buena" | "buena" | "con_detalles";

/** En el orden de la escala, de mejor a peor. */
export const CONDICIONES: readonly CondicionDePieza[] = [
  "excelente",
  "muy_buena",
  "buena",
  "con_detalles",
];

/** Cómo se nombra cada condición en el panel. */
export const TEXTO_DE_CONDICION: Record<CondicionDePieza, string> = {
  excelente: "Excelente",
  muy_buena: "Muy buena",
  buena: "Buena",
  con_detalles: "Con detalles",
};

const A_PRISMA = {
  excelente: "EXCELENTE",
  muy_buena: "MUY_BUENA",
  buena: "BUENA",
  con_detalles: "CON_DETALLES",
} as const satisfies Record<CondicionDePieza, CondicionDePrisma>;

const DE_PRISMA = {
  EXCELENTE: "excelente",
  MUY_BUENA: "muy_buena",
  BUENA: "buena",
  CON_DETALLES: "con_detalles",
} as const satisfies Record<CondicionDePrisma, CondicionDePieza>;

export function condicionAPrisma(condicion: CondicionDePieza): CondicionDePrisma {
  return A_PRISMA[condicion];
}

export function condicionDePrisma(condicion: CondicionDePrisma): CondicionDePieza {
  return DE_PRISMA[condicion];
}

/** Si el valor es una de las cuatro condiciones válidas. */
export function esCondicionValida(valor: unknown): valor is CondicionDePieza {
  return typeof valor === "string" && Object.hasOwn(A_PRISMA, valor);
}
