import { configuracionTienda } from "~/configuracion/tienda";
import type { PrismaClient } from "~/generated/prisma/client";

import { crearAbastecimiento } from "./abastecimiento";
import { listarCatalogo, type FiltrosDeCatalogo } from "./catalogo";
import { crearFotos } from "./fotos";
import { ampliarLista, obtenerListas, type Lista } from "./listas";
import { crearPiezas, type ConfiguracionDePiezas } from "./piezas";
import { crearReservas } from "./reservas";

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
  const configDePiezas: ConfiguracionDePiezas = {
    prefijoDeCodigo: opciones.prefijoDeCodigo ?? configuracionTienda.prefijoDeCodigo,
    umbralesDeTamano: opciones.umbralesDeTamano ?? configuracionTienda.umbralesDeTamano,
    ahora: opciones.ahora ?? (() => new Date()),
  };
  const piezas = crearPiezas(db, configDePiezas);
  const reservas = crearReservas(db, configDePiezas);
  const fotos = crearFotos(db, { prefijoDeCodigo: configDePiezas.prefijoDeCodigo });
  // `abrirLote` recibe también la configuración para poder crear las piezas
  // del lote dentro de su propia transacción (ver abastecimiento.ts).
  const abastecimiento = crearAbastecimiento(db, piezas, configDePiezas);

  /**
   * Vencimiento perezoso: antes de leer el estado de una pieza, vence las
   * reservas cuyo plazo ya terminó. Así ninguna lectura depende de un barrido
   * periódico.
   */
  function trasVencer<A extends unknown[], R>(operacion: (...args: A) => Promise<R>) {
    return async (...args: A): Promise<R> => {
      await reservas.vencerReservas();
      return operacion(...args);
    };
  }

  const configuracionDeCatalogo = {
    prefijoDeCodigo: configDePiezas.prefijoDeCodigo,
    umbralesDeTamano: configDePiezas.umbralesDeTamano,
  };

  return {
    /**
     * Piezas que ve la compradora en el listado principal, más recientes
     * primero, con los filtros de `filtros` y hasta `limite` piezas. Antes de
     * leer, vence las reservas cuyo plazo ya terminó.
     */
    listarCatalogo: trasVencer((filtros?: FiltrosDeCatalogo, limite?: number) =>
      listarCatalogo(db, configuracionDeCatalogo, filtros, limite),
    ),

    // --- Inventario ---
    ...piezas,
    fichaPublica: trasVencer(piezas.fichaPublica),
    piezaDelPanel: trasVencer(piezas.piezaDelPanel),
    listarPiezasDelPanel: trasVencer(piezas.listarPiezasDelPanel),

    // --- Reservas, compradoras e interesadas ---
    ...reservas,

    // --- Fotos de pieza: las 8 tomas mínimas, su orden fijo y su portada ---
    ...fotos,

    // --- Abastecimiento: proveedores, lotes, apertura y compra a particular ---
    ...abastecimiento,

    // --- Listas ampliables (tipo de cartera, color, material, calidad declarada) ---
    /** Los valores de cada lista, en orden de alta. */
    listas: () => obtenerListas(db),
    /** Suma un valor a una lista, o devuelve el que ya existe con ese nombre. */
    ampliarLista: (lista: Lista, nombre: string) => ampliarLista(db, lista, nombre),
  };
}

export type Dominio = ReturnType<typeof crearDominio>;

export type {
  CanalDeAbastecimiento,
  DatosDeApertura,
  DatosDeCompraAParticular,
  DatosDeLote,
  DatosDeProveedor,
  LoteDelPanel,
  Proveedor,
} from "./abastecimiento";
export {
  CANALES_DE_ABASTECIMIENTO,
  TEXTO_DE_CANAL,
  UNIDADES_MAXIMAS,
} from "./abastecimiento";
export type {
  FiltrosDeCatalogo,
  PaginaDeCatalogo,
  PiezaEnCatalogo,
} from "./catalogo";
export { PIEZAS_POR_PAGINA } from "./catalogo";
export { CONDICIONES, TEXTO_DE_CONDICION, type CondicionDePieza } from "./condicion";
export { ErrorDeDominio, type MotivoDeRechazo } from "./errores";
export {
  TOMAS_REQUERIDAS,
  type DatosDeFoto,
  type FotoDelPanel,
  type FotoPublica,
  type TipoDeToma,
} from "./fotos";
export type { Lista, Listas, OpcionDeColor, OpcionDeLista } from "./listas";
export type {
  CampoDePieza,
  DatosDePieza,
  EstadoDePieza,
  FichaPublica,
  PiezaDelPanel,
  PiezaEnPanel,
} from "./piezas";
export { COSTO_DIRECTO_MAXIMO_CENTAVOS, repartoDeLote } from "./piezas";
export {
  PLAZO_POR_DEFECTO,
  type Compradora,
  type CompradoraDeReserva,
  type DatosDeInteresada,
  type DatosDeReserva,
  type Interesada,
  type OrigenDeLaReserva,
  type ReglaDeCompradora,
  type ReservaActiva,
} from "./reservas";
export type { Tamano, UmbralesDeTamano } from "./tamano";
export {
  crearAccesoAlPanel,
  OPERADORA_DE_PRUEBA,
  type AccesoAlPanel,
} from "./acceso";
