import type { EstadoPieza, Prisma, PrismaClient } from "~/generated/prisma/client";

import { formatearCodigo, rutaPublica } from "./identificadores";
import {
  anchoDeTamano,
  tamanoPorAncho,
  type Tamano,
  type UmbralesDeTamano,
} from "./tamano";

/** Lo que el dominio necesita saber de la tienda para armar el listado. */
export interface ConfiguracionDeCatalogo {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
  umbralesDeTamano: UmbralesDeTamano;
}

/**
 * Estados que la compradora ve en el listado principal y cómo se nombran
 * fuera del dominio. Las Vendidas van aparte ("Ver vendidas"); En preparación
 * y Retirada nunca se listan.
 */
const estadosDelListado = {
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
} as const satisfies Partial<Record<EstadoPieza, string>>;

type EstadoDelListado = keyof typeof estadosDelListado;

/** Cuántas piezas trae una página del listado si no se pide otra cosa. */
export const PIEZAS_POR_PAGINA = 24;

/** Los filtros del listado, todos opcionales y combinables entre sí. */
export interface FiltrosDeCatalogo {
  tipoId?: number;
  colorId?: number;
  tamano?: Tamano;
  precioMinCentavos?: number;
  precioMaxCentavos?: number;
}

/**
 * Lo que la compradora ve de una pieza en el listado principal. Nunca expone
 * lo interno (ID, lote, proveedor, costo, condición de ingreso): sale solo de
 * `listarCatalogo`.
 */
export interface PiezaEnCatalogo {
  /** "VT-0001": la Ref. que identifica la pieza. */
  codigo: string;
  nombre: string;
  /** La ruta pública de su ficha, `/carteras/<slug>-<sufijo>`. */
  ruta: string;
  estado: (typeof estadosDelListado)[EstadoDelListado];
  precioCentavos: number;
  tamano: Tamano;
  /**
   * Hueco para la foto principal en su variante "catálogo" (ADR 0005): llega
   * con el #5. Hasta entonces, el listado se ve sin fotos, igual que la ficha.
   */
  foto: null;
}

/** Una página del listado principal. */
export interface PaginaDeCatalogo {
  piezas: PiezaEnCatalogo[];
  /** Hay piezas más allá de esta página: la carga incremental puede pedir más. */
  hayMas: boolean;
}

type FilaDePieza = Prisma.PiezaGetPayload<object>;

function aPiezaEnCatalogo(
  fila: FilaDePieza,
  config: ConfiguracionDeCatalogo,
): PiezaEnCatalogo {
  const { nombre, anchoCm, precioCentavos } = fila;
  if (!nombre || !anchoCm || !precioCentavos) {
    throw new Error(
      `La pieza ${formatearCodigo(fila.codigo, config.prefijoDeCodigo)} está publicada sin sus datos obligatorios.`,
    );
  }
  return {
    codigo: formatearCodigo(fila.codigo, config.prefijoDeCodigo),
    nombre,
    ruta: rutaPublica(nombre, fila.sufijo),
    estado: estadosDelListado[fila.estado as EstadoDelListado],
    precioCentavos,
    tamano: tamanoPorAncho(anchoCm, config.umbralesDeTamano),
    foto: null,
  };
}

/**
 * El listado principal del catálogo: Disponibles y Reservadas, más recientes
 * primero, con los filtros combinados de `filtros`. `limite` es cuántas
 * piezas traer desde el principio (no un cursor): la carga incremental pide
 * de nuevo con un límite mayor.
 */
export async function listarCatalogo(
  db: PrismaClient,
  config: ConfiguracionDeCatalogo,
  filtros: FiltrosDeCatalogo = {},
  limite: number = PIEZAS_POR_PAGINA,
): Promise<PaginaDeCatalogo> {
  const where: Prisma.PiezaWhereInput = {
    estado: { in: Object.keys(estadosDelListado) as EstadoDelListado[] },
  };

  if (filtros.tipoId !== undefined) where.tipoId = filtros.tipoId;
  if (filtros.colorId !== undefined) where.colorId = filtros.colorId;

  if (filtros.tamano !== undefined) {
    const { desde, hasta } = anchoDeTamano(filtros.tamano, config.umbralesDeTamano);
    where.anchoCm = { gte: desde, ...(hasta !== null ? { lt: hasta } : {}) };
  }

  if (filtros.precioMinCentavos !== undefined || filtros.precioMaxCentavos !== undefined) {
    where.precioCentavos = {
      ...(filtros.precioMinCentavos !== undefined ? { gte: filtros.precioMinCentavos } : {}),
      ...(filtros.precioMaxCentavos !== undefined ? { lte: filtros.precioMaxCentavos } : {}),
    };
  }

  const filas = await db.pieza.findMany({
    where,
    orderBy: [{ publicadaEn: "desc" }, { codigo: "desc" }],
    take: limite + 1,
  });

  return {
    piezas: filas.slice(0, limite).map((fila) => aPiezaEnCatalogo(fila, config)),
    hayMas: filas.length > limite,
  };
}
