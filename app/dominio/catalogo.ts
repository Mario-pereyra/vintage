import type { EstadoPieza, Prisma, PrismaClient } from "~/generated/prisma/client";

import { formatearCodigo, rutaPublica } from "./identificadores";
import { PRECIO_MAXIMO_CENTAVOS } from "./piezas";
import {
  anchoDeTamano,
  tamanoPorAncho,
  type Tamano,
  type UmbralesDeTamano,
} from "./tamano";

/**
 * Tope de una columna INTEGER (32 bits) en Postgres. `tipoId` y `colorId` lo
 * son: un filtro fuera de este rango no se ignora en el `where`, hace fallar
 * la consulta entera. Los filtros llegan de parámetros de la URL, así que
 * cualquier entero "sintácticamente válido" puede pedirse.
 */
const ID_MAXIMO_DE_COLUMNA = 2_147_483_647;

/**
 * Un ID de filtro (`tipoId`, `colorId`) válido, o `undefined` si se ignora.
 * Se exporta para que otras consultas del panel (`consultas.ts`, inventario
 * con `loteId` y `tipoId`) reutilicen la misma acotación en vez de duplicarla.
 */
export function idDeFiltro(id: number | undefined): number | undefined {
  if (id === undefined) return undefined;
  return Number.isSafeInteger(id) && id > 0 && id <= ID_MAXIMO_DE_COLUMNA ? id : undefined;
}

/**
 * Un precio de filtro válido, acotado al mismo tope que un precio de pieza
 * (`PRECIO_MAXIMO_CENTAVOS`, también una columna INTEGER). Un valor que no es
 * un entero positivo se ignora en vez de acotarse a 0 o menos.
 */
function precioDeFiltro(centavos: number | undefined): number | undefined {
  if (centavos === undefined) return undefined;
  if (!Number.isSafeInteger(centavos) || centavos <= 0) return undefined;
  return Math.min(centavos, PRECIO_MAXIMO_CENTAVOS);
}

/**
 * Los filtros ya validados para pasar a la consulta: IDs fuera del rango de su
 * columna se ignoran, el precio se acota al tope de una pieza y, si el mínimo
 * queda mayor que el máximo, se intercambian (un enlace armado a mano puede
 * llegar así, y el resultado sigue teniendo sentido).
 */
function normalizarFiltros(filtros: FiltrosDeCatalogo): FiltrosDeCatalogo {
  let precioMinCentavos = precioDeFiltro(filtros.precioMinCentavos);
  let precioMaxCentavos = precioDeFiltro(filtros.precioMaxCentavos);
  if (
    precioMinCentavos !== undefined &&
    precioMaxCentavos !== undefined &&
    precioMinCentavos > precioMaxCentavos
  ) {
    [precioMinCentavos, precioMaxCentavos] = [precioMaxCentavos, precioMinCentavos];
  }

  return {
    tipoId: idDeFiltro(filtros.tipoId),
    colorId: idDeFiltro(filtros.colorId),
    tamano: filtros.tamano,
    vendidas: filtros.vendidas === true,
    precioMinCentavos,
    precioMaxCentavos,
  };
}

/** Lo que el dominio necesita saber de la tienda para armar el listado. */
export interface ConfiguracionDeCatalogo {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
  umbralesDeTamano: UmbralesDeTamano;
}

/**
 * Estados que la compradora ve en el catálogo y cómo se nombran fuera del
 * dominio. El listado principal muestra Disponibles y Reservadas; las
 * Vendidas se ven solo con el filtro "Ver vendidas" (vendidas visibles). En
 * preparación y Retirada nunca se listan.
 */
const estadosDelListado = {
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
  VENDIDA: "vendida",
} as const satisfies Partial<Record<EstadoPieza, string>>;

const ESTADOS_DEL_LISTADO_PRINCIPAL: EstadoDelListado[] = ["DISPONIBLE", "RESERVADA"];

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
  /**
   * "Ver vendidas": en lugar del listado principal, solo las Vendidas, la
   * última vendida primero. Se combina con los demás filtros.
   */
  vendidas?: boolean;
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
  /**
   * El precio publicado. En una vendida también: el precio final (tras el
   * regateo) es interno y nunca se publica.
   */
  precioCentavos: number;
  tamano: Tamano;
  /**
   * La portada en su variante "catálogo" (las fotos se redimensionan en el
   * navegador al subirlas, en miniatura, catálogo y detalle). `null` si la
   * pieza todavía no tiene fotos cargadas.
   */
  foto: { claveCatalogo: string; alt: string } | null;
}

/** Una página del listado principal. */
export interface PaginaDeCatalogo {
  piezas: PiezaEnCatalogo[];
  /** Hay piezas más allá de esta página: la carga incremental puede pedir más. */
  hayMas: boolean;
}

type FilaDePieza = Prisma.PiezaGetPayload<{
  include: { fotos: { where: { portada: true } } };
}>;

/**
 * Una fila lista para el listado, o `null` si le faltan datos obligatorios.
 * Eso no debería pasar (Disponible y Reservada solo se llega publicando, que
 * los exige), pero una sola fila así no puede tumbar el listado entero para
 * todas las compradoras: se omite en vez de reventar la consulta.
 */
function aPiezaEnCatalogo(
  fila: FilaDePieza,
  config: ConfiguracionDeCatalogo,
): PiezaEnCatalogo | null {
  const { nombre, anchoCm, precioCentavos } = fila;
  if (!nombre || !anchoCm || !precioCentavos) return null;
  const portada = fila.fotos[0];
  return {
    codigo: formatearCodigo(fila.codigo, config.prefijoDeCodigo),
    nombre,
    ruta: rutaPublica(nombre, fila.sufijo),
    estado: estadosDelListado[fila.estado as EstadoDelListado],
    precioCentavos,
    tamano: tamanoPorAncho(anchoCm, config.umbralesDeTamano),
    foto: portada ? { claveCatalogo: portada.claveCatalogo, alt: nombre } : null,
  };
}

/**
 * El listado principal del catálogo: Disponibles y Reservadas, más recientes
 * primero, con los filtros combinados de `filtros`. Con `vendidas`, solo las
 * Vendidas, la última vendida primero. `limite` es cuántas
 * piezas traer desde el principio (no un cursor): la carga incremental pide
 * de nuevo con un límite mayor.
 */
export async function listarCatalogo(
  db: PrismaClient,
  config: ConfiguracionDeCatalogo,
  filtrosCrudos: FiltrosDeCatalogo = {},
  limite: number = PIEZAS_POR_PAGINA,
): Promise<PaginaDeCatalogo> {
  const filtros = normalizarFiltros(filtrosCrudos);
  const where: Prisma.PiezaWhereInput = filtros.vendidas
    ? { estado: "VENDIDA" }
    : { estado: { in: ESTADOS_DEL_LISTADO_PRINCIPAL } };

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
    orderBy: filtros.vendidas
      ? [{ venta: { vendidaEn: "desc" } }, { codigo: "desc" }]
      : [{ publicadaEn: "desc" }, { codigo: "desc" }],
    take: limite + 1,
    include: { fotos: { where: { portada: true } } },
  });

  return {
    piezas: filas
      .slice(0, limite)
      .map((fila) => aPiezaEnCatalogo(fila, config))
      .filter((pieza): pieza is PiezaEnCatalogo => pieza !== null),
    hayMas: filas.length > limite,
  };
}
