import { createContext, type RouterContextProvider } from "react-router";

import type { Dominio } from "~/dominio";

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
