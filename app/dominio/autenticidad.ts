import type { Autenticidad as AutenticidadDePrisma } from "~/generated/prisma/client";

/**
 * Grado de certeza sobre la marca de una pieza (ver "Autenticidad" en
 * CONTEXT.md, ADR 0002). Sin marca no hay autenticidad que declarar: el valor
 * queda en `null` (ver `Pieza.marcaId` en piezas.ts). "Original" no es un
 * valor de esta escala: es la consecuencia de mostrar una marca `comprobada`.
 */
export type AutenticidadDePieza = "comprobada" | "atribuida";

/** Cómo se nombra cada autenticidad en el panel. */
export const TEXTO_DE_AUTENTICIDAD: Record<AutenticidadDePieza, string> = {
  comprobada: "Comprobada",
  atribuida: "Atribuida",
};

const A_PRISMA = {
  comprobada: "COMPROBADA",
  atribuida: "ATRIBUIDA",
} as const satisfies Record<AutenticidadDePieza, AutenticidadDePrisma>;

const DE_PRISMA = {
  COMPROBADA: "comprobada",
  ATRIBUIDA: "atribuida",
} as const satisfies Record<AutenticidadDePrisma, AutenticidadDePieza>;

export function autenticidadAPrisma(autenticidad: AutenticidadDePieza): AutenticidadDePrisma {
  return A_PRISMA[autenticidad];
}

export function autenticidadDePrisma(autenticidad: AutenticidadDePrisma): AutenticidadDePieza {
  return DE_PRISMA[autenticidad];
}

/** Si el valor es una de las dos autenticidades válidas. */
export function esAutenticidadValida(valor: unknown): valor is AutenticidadDePieza {
  return typeof valor === "string" && Object.hasOwn(A_PRISMA, valor);
}
