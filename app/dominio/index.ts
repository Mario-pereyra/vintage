import { configuracionTienda } from "~/configuracion/tienda";
import type { PrismaClient } from "~/generated/prisma/client";

import { listarCatalogo } from "./catalogo";
import { ampliarLista, obtenerListas, type Lista } from "./listas";
import { crearPiezas, type ConfiguracionDePiezas } from "./piezas";

export type OpcionesDelDominio = Partial<ConfiguracionDePiezas>;

/**
 * Módulo de dominio de Vintage: el único seam de prueba.
 *
 * Reúne las operaciones del negocio detrás de una interfaz pequeña. Los
 * loaders y actions de React Router validan la entrada, llaman a estas
 * operaciones y renderizan; nunca hablan con Prisma directamente.
 *
 * Las reglas rechazadas se lanzan como `ErrorDeDominio`.
 *
 * @param opciones Prefijo del código, umbrales de tamaño y reloj. Por defecto,
 *   los de `configuracionTienda` y la hora real; las pruebas los fijan.
 */
export function crearDominio(db: PrismaClient, opciones: OpcionesDelDominio = {}) {
  const piezas = crearPiezas(db, {
    prefijoDeCodigo: opciones.prefijoDeCodigo ?? configuracionTienda.prefijoDeCodigo,
    umbralesDeTamano: opciones.umbralesDeTamano ?? configuracionTienda.umbralesDeTamano,
    ahora: opciones.ahora ?? (() => new Date()),
  });

  return {
    /** Piezas que ve la compradora en el listado principal, más recientes primero. */
    listarCatalogo: () => listarCatalogo(db),

    // --- Inventario ---
    ...piezas,

    // --- Listas ampliables (tipo de cartera, color, material) ---
    /** Los valores de cada lista, en orden de alta. */
    listas: () => obtenerListas(db),
    /** Suma un valor a una lista, o devuelve el que ya existe con ese nombre. */
    ampliarLista: (lista: Lista, nombre: string) => ampliarLista(db, lista, nombre),
  };
}

export type Dominio = ReturnType<typeof crearDominio>;

export type { PiezaEnCatalogo } from "./catalogo";
export { ErrorDeDominio, type MotivoDeRechazo } from "./errores";
export type { Lista, Listas, OpcionDeColor, OpcionDeLista } from "./listas";
export type {
  CampoDePieza,
  DatosDePieza,
  EstadoDePieza,
  FichaPublica,
  PiezaDelPanel,
  PiezaEnPanel,
} from "./piezas";
export type { Tamano, UmbralesDeTamano } from "./tamano";
export {
  crearAccesoAlPanel,
  OPERADORA_DE_PRUEBA,
  type AccesoAlPanel,
} from "./acceso";
