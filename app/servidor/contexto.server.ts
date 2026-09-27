import { createContext, type RouterContextProvider } from "react-router";

import type { Dominio } from "~/dominio";

import type { Autenticacion, Operadora } from "./autenticacion.server";

/**
 * Da acceso al módulo de dominio de la request actual. Lo arma el Worker
 * (workers/app.ts) de forma perezosa: la conexión a la base solo se crea si
 * algún loader o action la usa.
 */
export const dominioContexto = createContext<() => Dominio>();

/** El módulo de dominio de esta request. Úsalo en loaders y actions. */
export function obtenerDominio(context: Readonly<RouterContextProvider>): Dominio {
  return context.get(dominioContexto)();
}

/** El login de operadoras de esta request. También lo arma el Worker, de forma perezosa. */
export const autenticacionContexto = createContext<() => Autenticacion>();

export function obtenerAutenticacion(
  context: Readonly<RouterContextProvider>,
): Autenticacion {
  return context.get(autenticacionContexto)();
}

/**
 * La operadora con sesión abierta. La carga el middleware del panel
 * (`routes/admin/layout.tsx`) antes de correr cualquier loader o action de `/admin`.
 */
export const operadoraContexto = createContext<Operadora | null>(null);

/** La operadora de esta request. Solo existe dentro de `/admin`. */
export function obtenerOperadora(context: Readonly<RouterContextProvider>): Operadora {
  const operadora = context.get(operadoraContexto);
  if (!operadora) {
    throw new Error("No hay operadora: esta ruta debe vivir dentro de /admin.");
  }
  return operadora;
}
