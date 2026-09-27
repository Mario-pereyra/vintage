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
 * lote, tipo, condición de ingreso y drop, y los días que una pieza vendida
 * estuvo publicada. A diferencia de `catalogo.ts` (que es público y excluye
 * En preparación), esto es una vista interna: trae piezas de cualquier
 * estado.
 */

/** Lo que el dominio necesita saber de la tienda para las consultas del panel. */
export interface ConfiguracionDeConsultas {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
}

/**
 * Tope de dígitos de búsqueda: de sobra para el código de cualquier pieza real
 * (`VT-0142` son 4). Un texto más largo se acota en vez de rechazarse: esto es
 * una búsqueda, no un formulario.
 */
const DIGITOS_DE_BUSQUEDA_MAXIMO = 20;

/** Los filtros del inventario del panel, todos opcionales y combinables. */
export interface FiltrosDeInventario {
  /** Código completo (`VT-0142`) o parcial, por ejemplo "142". */
  texto?: string;
  loteId?: number;
  tipoId?: number;
  condicionIngreso?: CondicionDePieza;
  dropId?: number;
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

/**
 * Solo los dígitos del texto buscado, acotados: el prefijo (`VT-`) y
 * cualquier separador se descartan, así "VT-142" busca lo mismo que "142". Sin
 * dígitos (p. ej. buscar "v", "t" o "vt", que son parte de todos los códigos)
 * no queda nada que comparar contra el código.
 */
function digitosDeBusqueda(texto: string): string {
  return texto.replace(/\D/g, "").slice(0, DIGITOS_DE_BUSQUEDA_MAXIMO);
}

/**
 * Si el número de una pieza coincide con los dígitos buscados, contra el
 * número sin relleno (`142`) y con relleno a como se muestra (`0142`): un
 * número completo coincide exacto contra alguna de las dos formas, y uno
 * parcial coincide por "contiene". Sin dígitos buscados, no coincide con
 * nada: una pieza no se encuentra por su Ref. con un texto que no tiene
 * cifras.
 */
function coincideConCodigo(numero: number, digitosBuscados: string): boolean {
  if (!digitosBuscados) return false;
  const sinRelleno = String(numero);
  const conRelleno = sinRelleno.padStart(4, "0");
  return sinRelleno.includes(digitosBuscados) || conRelleno.includes(digitosBuscados);
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
 * pantalla. Se puede acotar por código (completo o parcial), lote, tipo,
 * condición de ingreso y drop, combinables entre sí. Las más recientes
 * primero.
 *
 * Todos los filtros llegan de parámetros de la URL: un valor fuera de rango
 * (un `loteId`, `tipoId` o `dropId` que no entra en una columna INTEGER, una
 * condición que no es de la lista, un texto absurdamente largo) se ignora o
 * se acota, nunca rompe la consulta.
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

  const dropId = idDeFiltro(filtrosCrudos.dropId);
  if (dropId !== undefined) where.dropId = dropId;

  const textoBuscado = (filtrosCrudos.texto ?? "").trim();
  const digitosBuscados = digitosDeBusqueda(textoBuscado);
  // Se escribió algo, pero no tiene ninguna cifra ("bandolera", "vt"): no hay
  // Ref. que pueda coincidir, así que no tiene sentido consultar la base.
  if (textoBuscado && !digitosBuscados) return [];

  const filas = await db.pieza.findMany({
    where,
    orderBy: { codigo: "desc" },
    include: { venta: { select: { vendidaEn: true } } },
  });

  const filasQueCoinciden = digitosBuscados
    ? filas.filter((fila) => coincideConCodigo(fila.codigo, digitosBuscados))
    : filas;

  return filasQueCoinciden.map((fila) => aPiezaDelInventario(fila, config));
}
