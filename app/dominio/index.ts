import { configuracionTienda } from "~/configuracion/tienda";
import type { PrismaClient } from "~/generated/prisma/client";

import { crearAbastecimiento } from "./abastecimiento";
import { listarCatalogo, type FiltrosDeCatalogo } from "./catalogo";
import { buscarInventario, type FiltrosDeInventario } from "./consultas";
import { crearDrops } from "./drops";
import { crearFotos } from "./fotos";
import { crearHistorialDePrecio } from "./historial-de-precio";
import { ampliarLista, obtenerListas, type Lista } from "./listas";
import { crearPiezas, type ConfiguracionDePiezas } from "./piezas";
import { crearRentabilidad } from "./rentabilidad";
import {
  compradoraSinVencer,
  crearReservas,
  reservasVencidasDeCompradoraSinVencer,
  type Compradora,
  type ReservaVencidaDeCompradora,
} from "./reservas";
import { crearRetiros } from "./retiros";
import { crearVentas, type Venta } from "./ventas";

export type OpcionesDelDominio = Partial<ConfiguracionDePiezas>;

/** El historial de una compradora (#13): sus compras y sus reservas vencidas. */
export interface HistorialDeCompradora {
  compradora: Compradora;
  compras: Venta[];
  reservasVencidas: ReservaVencidaDeCompradora[];
}

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
  const ventas = crearVentas(db, configDePiezas);
  const retiros = crearRetiros(db, configDePiezas);
  const fotos = crearFotos(db, { prefijoDeCodigo: configDePiezas.prefijoDeCodigo });
  // `abrirLote` recibe también la configuración para poder crear las piezas
  // del lote dentro de su propia transacción (ver abastecimiento.ts).
  const abastecimiento = crearAbastecimiento(db, piezas, configDePiezas);
  // Drops (#12): agrupan piezas En preparación y las publican reusando
  // `publicarPieza`, sin duplicar sus reglas de estado ni de datos mínimos.
  const drops = crearDrops(db, piezas, { prefijoDeCodigo: configDePiezas.prefijoDeCodigo });
  const historialDePrecio = crearHistorialDePrecio(db, {
    prefijoDeCodigo: configDePiezas.prefijoDeCodigo,
    ahora: configDePiezas.ahora,
  });
  const rentabilidad = crearRentabilidad(db);

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
  const configuracionDeConsultas = { prefijoDeCodigo: configDePiezas.prefijoDeCodigo };

  /**
   * El historial de una compradora (#13): sus compras y sus reservas
   * vencidas, la más reciente primero. `null` si la compradora no existe.
   *
   * Vence las reservas una sola vez para toda la carga (por eso no se envuelve
   * con `trasVencer`, que volvería a hacerlo) y usa las variantes "sin vencer"
   * de `reservas.ts` para no repetirlo dentro de cada lectura.
   */
  async function historialDeCompradora(
    compradoraId: string,
  ): Promise<HistorialDeCompradora | null> {
    await reservas.vencerReservas();
    const [compradora, compras, reservasVencidas] = await Promise.all([
      compradoraSinVencer(db, compradoraId),
      ventas.comprasDeCompradora(compradoraId),
      reservasVencidasDeCompradoraSinVencer(db, compradoraId, configDePiezas.prefijoDeCodigo),
    ]);
    return compradora ? { compradora, compras, reservasVencidas } : null;
  }

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

    // --- Consultas del inventario del panel (#13): búsqueda, filtros y días
    // publicada de cada pieza vendida ---
    buscarInventario: trasVencer((filtros?: FiltrosDeInventario) =>
      buscarInventario(db, configuracionDeConsultas, filtros),
    ),

    // --- Reservas, compradoras e interesadas ---
    ...reservas,

    // --- Fotos de pieza: las 8 tomas mínimas, su orden fijo y su portada ---
    ...fotos,

    // --- Abastecimiento: proveedores, lotes, apertura y compra a particular ---
    ...abastecimiento,

    // --- Rentabilidad por lote y proveedor, y calidad detectada (interno) ---
    ...rentabilidad,

    // --- Venta con pago verificado, entrega y retiro ---
    registrarVenta: trasVencer(ventas.registrarVenta),
    ventaDePieza: ventas.ventaDePieza,
    comprasDeCompradora: ventas.comprasDeCompradora,
    marcarEntregada: ventas.marcarEntregada,
    registrarGuia: ventas.registrarGuia,
    listarEntregasPendientes: ventas.listarEntregasPendientes,
    retirarPieza: trasVencer(retiros.retirarPieza),
    retiroDePieza: retiros.retiroDePieza,

    // --- Drops: agrupar piezas y publicarlas juntas o de a poco (#12) ---
    ...drops,

    // --- Historial de precios del precio publicado (#12) ---
    ...historialDePrecio,

    // --- Historial de compradora (#13): compras y reservas vencidas ---
    // Sin `trasVencer`: `historialDeCompradora` ya vence una sola vez por sí
    // misma (ver su comentario más arriba).
    historialDeCompradora,

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
export {
  TEXTO_DE_AUTENTICIDAD,
  type AutenticidadDePieza,
} from "./autenticidad";
export { diasPublicada, type FiltrosDeInventario, type PiezaDelInventario } from "./consultas";
export {
  CODIGOS_MAXIMOS_POR_ASIGNACION,
  numeroDeDrop,
  type DropDelPanel,
  type PiezaDeDrop,
} from "./drops";
export { ErrorDeDominio, type MotivoDeRechazo } from "./errores";
export {
  TOMAS_REQUERIDAS,
  type DatosDeFoto,
  type FotoDelPanel,
  type FotoPublica,
  type TipoDeToma,
} from "./fotos";
export type { PrecioDelHistorial } from "./historial-de-precio";
export type { Lista, Listas, OpcionDeColor, OpcionDeLista } from "./listas";
export {
  PRECIO_MAXIMO_CENTAVOS,
  type CampoDePieza,
  type DatosDePieza,
  type EstadoDePieza,
  type FichaPublica,
  type PiezaDelPanel,
  type PiezaEnPanel,
} from "./piezas";
export {
  ATRIBUTO_TEXTO_MAXIMO,
  COSTO_DIRECTO_MAXIMO_CENTAVOS,
  DESCRIPCION_MAXIMA,
  NOTA_CONDICION_MAXIMA,
  repartoDeLote,
} from "./piezas";
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
  type ReservaVencidaDeCompradora,
} from "./reservas";
export type { DatosDeRetiro, MotivoDelRetiro, RetiroDePieza } from "./retiros";
export {
  COSTO_DE_ENTREGA_MAXIMO_CENTAVOS,
  type CanalDeLaVenta,
  type DatosDeEntrega,
  type DatosDeVenta,
  type Entrega,
  type EstadoDeLaEntrega,
  type ModalidadDeLaEntrega,
  type Venta,
} from "./ventas";
export type {
  CalidadDetectada,
  CalidadPorDeclarada,
  CifrasDeRentabilidad,
  DetalleDeLote,
  DetalleDeProveedor,
  EstadoDelLote,
  FilaPorCondicion,
  FilaPorTipo,
  FiltrosDeRentabilidad,
  RentabilidadDeLote,
  RentabilidadDeProveedor,
} from "./rentabilidad";
export type { Tamano, UmbralesDeTamano } from "./tamano";
export {
  crearAccesoAlPanel,
  OPERADORA_DE_PRUEBA,
  type AccesoAlPanel,
} from "./acceso";
