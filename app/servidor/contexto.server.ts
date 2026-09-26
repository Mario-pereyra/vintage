import { createContext } from "react-router";

import type { Dominio } from "~/dominio";

/**
 * El módulo de dominio de la request actual. Lo arma el Worker
 * (workers/app.ts) y los loaders/actions lo leen con `context.get(dominioContexto)`.
 */
export const dominioContexto = createContext<Dominio>();
