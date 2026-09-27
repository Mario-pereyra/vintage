import type { EstadoPieza, Prisma, PrismaClient } from "~/generated/prisma/client";

import { idDeFiltro } from "./catalogo";
import {
  condicionAPrisma,
  condicionDePrisma,
  esCondicionValida,
  type CondicionDePieza,
} from "./condicion";
import { formatearCodigo } from "./identificadores";
import type { EstadoDePieza } from "./piezas";

/**
 * Consultas del inventario del panel (#13): búsqueda por código, filtros por
 * lote, tipo y condición de ingreso, y los días que una pieza vendida estuvo
 * publicada. A diferencia de `catalogo.ts` (que es público y excluye En
 * preparación), esto es una vista interna: trae piezas de cualquier estado.
 *
 * El filtro por drop queda para cuando el drop exista (#12, en paralelo): no
 * se agrega un campo por adelantado.
 */

/** Lo que el dominio necesita saber de la tienda para las consultas del panel. */
export interface ConfiguracionDeConsultas {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
}

/**
 * Largo máximo del texto de búsqueda: de sobra para un código completo
 * (`VT-0142`) o un fragmento de sus dígitos. Un texto más largo se acota en
 * vez de rechazarse: esto es una búsqueda, no un formulario.
 */
const TEXTO_DE_BUSQUEDA_MAXIMO = 20;

/** Los filtros del inventario del panel, todos opcionales y combinables. */
export interface FiltrosDeInventario {
  /** Código completo (`VT-0142`) o parcial, por ejemplo "142". */
  texto?: string;
  loteId?: number;
  tipoId?: number;
  condicionIngreso?: CondicionDePieza;
}

/** Una pieza del inventario del panel, agrupable por estado en la pantalla. */
export interface PiezaDelInventario {
  codigo: string;
  nombre: string | null;
  estado: EstadoDePieza;
  precioCentavos: number | null;
  tipoId: number | null;
  loteId: number | null;
  condicionIngreso: CondicionDePieza | null;
  /**
   * Los días que estuvo publicada hasta venderse, contados por calendario de
   * Bolivia (ver `diasPublicada`). `null` si la pieza no está Vendida.
   */
  diasPublicada: number | null;
}

const nombreDeEstado = {
  EN_PREPARACION: "en_preparacion",
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
  VENDIDA: "vendida",
  RETIRADA: "retirada",
} as const satisfies Record<EstadoPieza, EstadoDePieza>;

/** Desfase fijo de Bolivia: UTC−4 todo el año, sin horario de verano. */
const DESFASE_DE_BOLIVIA_MS = 4 * 60 * 60 * 1000;
const UN_DIA_MS = 24 * 60 * 60 * 1000;

/** El día calendario en Bolivia de un instante, como entero de días desde la época. */
function diaEnBolivia(fecha: Date): number {
  return Math.floor((fecha.getTime() - DESFASE_DE_BOLIVIA_MS) / UN_DIA_MS);
}

/**
 * Los días que una pieza estuvo publicada hasta su venta: la diferencia de
 * días de calendario en Bolivia (UTC−4) entre `publicadaEn` y `vendidaEn`, no
 * las 24 horas exactas. Por ejemplo, publicada 23:50 y vendida 00:10 del día
 * siguiente (hora de Bolivia) cuenta 1 día, aunque hayan pasado 20 minutos.
 *
 * Se calcula al leer, con las fechas ya guardadas: no depende de ningún
 * barrido periódico (sin cron).
 */
export function diasPublicada(publicadaEn: Date, vendidaEn: Date): number {
  return diaEnBolivia(vendidaEn) - diaEnBolivia(publicadaEn);
}

/** Recorta y deja solo letras y dígitos, en minúsculas: para comparar códigos. */
function normalizar(texto: string): string {
  return texto
    .trim()
    .slice(0, TEXTO_DE_BUSQUEDA_MAXIMO)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Si el código formateado (`VT-0142`) coincide con el texto buscado, completo
 * o parcial ("142", que es un fragmento de "0142"). Sin texto, coincide
 * siempre.
 */
function coincideConTexto(codigoFormateado: string, textoNormalizado: string): boolean {
  if (!textoNormalizado) return true;
  return normalizar(codigoFormateado).includes(textoNormalizado);
}

type FilaDeInventario = Prisma.PiezaGetPayload<{
  include: { venta: { select: { vendidaEn: true } } };
}>;

function aPiezaDelInventario(
  fila: FilaDeInventario,
  config: ConfiguracionDeConsultas,
): PiezaDelInventario {
  return {
    codigo: formatearCodigo(fila.codigo, config.prefijoDeCodigo),
    nombre: fila.nombre,
    estado: nombreDeEstado[fila.estado],
    precioCentavos: fila.precioCentavos,
    tipoId: fila.tipoId,
    loteId: fila.loteId,
    condicionIngreso: fila.condicionIngreso ? condicionDePrisma(fila.condicionIngreso) : null,
    diasPublicada:
      fila.estado === "VENDIDA" && fila.publicadaEn && fila.venta
        ? diasPublicada(fila.publicadaEn, fila.venta.vendidaEn)
        : null,
  };
}

/**
 * El inventario del panel: piezas de cualquier estado (En preparación,
 * Disponible, Reservada, Vendida o Retirada), para agrupar por estado en la
 * pantalla. Se puede acotar por código (completo o parcial), lote, tipo y
 * condición de ingreso, combinables entre sí. Las más recientes primero.
 *
 * Todos los filtros llegan de parámetros de la URL: un valor fuera de rango
 * (un `loteId` o `tipoId` que no entra en una columna INTEGER, una condición
 * que no es de la lista, un texto absurdamente largo) se ignora o se acota,
 * nunca rompe la consulta.
 */
export async function buscarInventario(
  db: PrismaClient,
  config: ConfiguracionDeConsultas,
  filtrosCrudos: FiltrosDeInventario = {},
): Promise<PiezaDelInventario[]> {
  const where: Prisma.PiezaWhereInput = {};

  const loteId = idDeFiltro(filtrosCrudos.loteId);
  if (loteId !== undefined) where.loteId = loteId;

  const tipoId = idDeFiltro(filtrosCrudos.tipoId);
  if (tipoId !== undefined) where.tipoId = tipoId;

  if (filtrosCrudos.condicionIngreso !== undefined && esCondicionValida(filtrosCrudos.condicionIngreso)) {
    where.condicionIngreso = condicionAPrisma(filtrosCrudos.condicionIngreso);
  }

  const textoNormalizado = normalizar(filtrosCrudos.texto ?? "");

  const filas = await db.pieza.findMany({
    where,
    orderBy: { codigo: "desc" },
    include: { venta: { select: { vendidaEn: true } } },
  });

  return filas
    .map((fila) => aPiezaDelInventario(fila, config))
    .filter((pieza) => coincideConTexto(pieza.codigo, textoNormalizado));
}
