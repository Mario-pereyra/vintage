import type {
  CanalDeAbastecimiento as CanalDePrisma,
  Prisma,
  PrismaClient,
} from "~/generated/prisma/client";

import { esCondicionValida, type CondicionDePieza } from "./condicion";
import { ErrorDeDominio } from "./errores";
import type { crearPiezas, PiezaDelPanel } from "./piezas";

/**
 * Abastecimiento (ticket #8, ADR 0001): proveedores, lotes, su apertura y la
 * compra a particular. Toda pieza llega por una de las dos vías: un lote
 * abierto o una compra a particular con costo directo. El costo de pieza
 * (reparto del lote más reacondicionamiento, o costo directo más
 * reacondicionamiento) lo calcula `piezas.ts` al leer la pieza.
 */

// --- Proveedores -------------------------------------------------------------

export interface Proveedor {
  id: number;
  nombre: string;
  contacto: string;
}

export interface DatosDeProveedor {
  nombre: string;
  contacto: string;
}

const NOMBRE_MAXIMO = 80;
const CONTACTO_MAXIMO = 80;

function validarProveedor(datos: DatosDeProveedor): DatosDeProveedor {
  const errores: Record<string, string> = {};
  const nombre = datos.nombre?.trim().replace(/\s+/g, " ") ?? "";
  const contacto = datos.contacto?.trim().replace(/\s+/g, " ") ?? "";

  if (!nombre) errores.nombre = "Escribe el nombre del proveedor.";
  else if (nombre.length > NOMBRE_MAXIMO) {
    errores.nombre = `Usa como máximo ${NOMBRE_MAXIMO} caracteres.`;
  }

  if (!contacto) errores.contacto = "Escribe un contacto (WhatsApp u otro medio).";
  else if (contacto.length > CONTACTO_MAXIMO) {
    errores.contacto = `Usa como máximo ${CONTACTO_MAXIMO} caracteres.`;
  }

  if (Object.keys(errores).length > 0) {
    throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
  }
  return { nombre, contacto };
}

// --- Canal de abastecimiento (fijo, no ampliable) -----------------------------

/**
 * Modalidad de un lote (ver "Canal de abastecimiento" en CONTEXT.md). Compra a
 * particular no tiene lote (es otra operación, `registrarCompraAParticular`)
 * y consignación queda fuera de la Etapa 1.
 */
export type CanalDeAbastecimiento = "fardo_cerrado" | "lote_clasificado" | "lote_seleccionado";

export const CANALES_DE_ABASTECIMIENTO: readonly CanalDeAbastecimiento[] = [
  "fardo_cerrado",
  "lote_clasificado",
  "lote_seleccionado",
];

export const TEXTO_DE_CANAL: Record<CanalDeAbastecimiento, string> = {
  fardo_cerrado: "Fardo cerrado",
  lote_clasificado: "Lote clasificado",
  lote_seleccionado: "Lote seleccionado",
};

const CANAL_A_PRISMA = {
  fardo_cerrado: "FARDO_CERRADO",
  lote_clasificado: "LOTE_CLASIFICADO",
  lote_seleccionado: "LOTE_SELECCIONADO",
} as const satisfies Record<CanalDeAbastecimiento, CanalDePrisma>;

const CANAL_DE_PRISMA = {
  FARDO_CERRADO: "fardo_cerrado",
  LOTE_CLASIFICADO: "lote_clasificado",
  LOTE_SELECCIONADO: "lote_seleccionado",
} as const satisfies Record<CanalDePrisma, CanalDeAbastecimiento>;

function esCanalValido(valor: unknown): valor is CanalDeAbastecimiento {
  return typeof valor === "string" && Object.hasOwn(CANAL_A_PRISMA, valor);
}

// --- Lotes ---------------------------------------------------------------

export interface DatosDeLote {
  proveedorId: number;
  canal: CanalDeAbastecimiento;
  calidadDeclaradaId: number;
  /** Precio pagado por el lote, en centavos, sin transporte. */
  costoCentavos: number;
  /** En centavos; 0 si no hubo transporte. */
  transporteCentavos?: number;
  fechaCompra: Date;
  fechaRecepcion?: Date | null;
}

/** Un lote tal como lo ve la operadora en el panel. */
export interface LoteDelPanel {
  id: number;
  proveedorId: number;
  proveedorNombre: string;
  canal: CanalDeAbastecimiento;
  calidadDeclaradaId: number;
  calidadDeclaradaNombre: string;
  costoCentavos: number;
  transporteCentavos: number;
  fechaCompra: Date;
  fechaRecepcion: Date | null;
  fechaApertura: Date | null;
  unidadesRecibidas: number | null;
  descartes: number | null;
  notaApertura: string | null;
  /** Cuántas piezas tiene ya (0 antes de abrirlo). */
  piezas: number;
  abierto: boolean;
}

/** Tope de un costo de lote: Bs 1.000.000, en centavos. */
const LOTE_COSTO_MAXIMO_CENTAVOS = 100_000_000;
/** Tope del transporte de un lote: Bs 50.000, en centavos. */
const TRANSPORTE_MAXIMO_CENTAVOS = 5_000_000;
/** Un lote no puede tener más piezas que esto en una sola apertura. */
const UNIDADES_MAXIMAS = 10_000;
/** Largo máximo de la nota de apertura. */
const NOTA_MAXIMA = 200;

export interface DatosDeApertura {
  fecha: Date;
  unidadesRecibidas: number;
  descartes: number;
  notaApertura?: string | null;
  /** Una condición de ingreso por cada pieza recibida (sin contar descartes). */
  condicionesDeIngreso: CondicionDePieza[];
}

export interface DatosDeCompraAParticular {
  proveedorId: number;
  /** Lo pagado por la pieza, en centavos. */
  costoDirectoCentavos: number;
  condicionIngreso?: CondicionDePieza | null;
}

type FilaDeLote = Prisma.LoteGetPayload<object>;

export function crearAbastecimiento(
  db: PrismaClient,
  piezas: ReturnType<typeof crearPiezas>,
) {
  async function aLoteDelPanel(fila: FilaDeLote): Promise<LoteDelPanel> {
    const [proveedor, calidadDeclarada, cantidadDePiezas] = await Promise.all([
      db.proveedor.findUniqueOrThrow({ where: { id: fila.proveedorId }, select: { nombre: true } }),
      db.calidadDeclarada.findUniqueOrThrow({
        where: { id: fila.calidadDeclaradaId },
        select: { nombre: true },
      }),
      db.pieza.count({ where: { loteId: fila.id } }),
    ]);
    return {
      id: fila.id,
      proveedorId: fila.proveedorId,
      proveedorNombre: proveedor.nombre,
      canal: CANAL_DE_PRISMA[fila.canal],
      calidadDeclaradaId: fila.calidadDeclaradaId,
      calidadDeclaradaNombre: calidadDeclarada.nombre,
      costoCentavos: fila.costoCentavos,
      transporteCentavos: fila.transporteCentavos,
      fechaCompra: fila.fechaCompra,
      fechaRecepcion: fila.fechaRecepcion,
      fechaApertura: fila.fechaApertura,
      unidadesRecibidas: fila.unidadesRecibidas,
      descartes: fila.descartes,
      notaApertura: fila.notaApertura,
      piezas: cantidadDePiezas,
      abierto: fila.fechaApertura !== null,
    };
  }

  async function exigirLote(id: number): Promise<FilaDeLote> {
    const fila = await db.lote.findUnique({ where: { id } });
    if (!fila) {
      throw new ErrorDeDominio("lote_no_encontrado", `No existe el lote ${id}.`);
    }
    return fila;
  }

  async function validarLote(datos: DatosDeLote): Promise<Required<DatosDeLote>> {
    const errores: Record<string, string> = {};

    const proveedorExiste =
      Number.isSafeInteger(datos.proveedorId) &&
      datos.proveedorId > 0 &&
      (await db.proveedor.count({ where: { id: datos.proveedorId } })) > 0;
    if (!proveedorExiste) errores.proveedorId = "Elige un proveedor existente.";

    if (!esCanalValido(datos.canal)) errores.canal = "Elige un canal de la lista.";

    const calidadExiste =
      Number.isSafeInteger(datos.calidadDeclaradaId) &&
      datos.calidadDeclaradaId > 0 &&
      (await db.calidadDeclarada.count({ where: { id: datos.calidadDeclaradaId } })) > 0;
    if (!calidadExiste) errores.calidadDeclaradaId = "Elige una calidad declarada de la lista.";

    if (
      !(
        Number.isSafeInteger(datos.costoCentavos) &&
        datos.costoCentavos > 0 &&
        datos.costoCentavos <= LOTE_COSTO_MAXIMO_CENTAVOS
      )
    ) {
      errores.costoCentavos = `Escribe un costo mayor que 0 y de hasta Bs ${(
        LOTE_COSTO_MAXIMO_CENTAVOS / 100
      ).toLocaleString("es-BO")}.`;
    }

    const transporteCentavos = datos.transporteCentavos ?? 0;
    if (
      !(
        Number.isSafeInteger(transporteCentavos) &&
        transporteCentavos >= 0 &&
        transporteCentavos <= TRANSPORTE_MAXIMO_CENTAVOS
      )
    ) {
      errores.transporteCentavos = `Escribe un monto entre 0 y Bs ${(
        TRANSPORTE_MAXIMO_CENTAVOS / 100
      ).toLocaleString("es-BO")}.`;
    }

    if (!(datos.fechaCompra instanceof Date) || Number.isNaN(datos.fechaCompra.getTime())) {
      errores.fechaCompra = "Escribe una fecha de compra válida.";
    }

    if (
      datos.fechaRecepcion != null &&
      (!(datos.fechaRecepcion instanceof Date) ||
        Number.isNaN(datos.fechaRecepcion.getTime()) ||
        (datos.fechaCompra instanceof Date && datos.fechaRecepcion < datos.fechaCompra))
    ) {
      errores.fechaRecepcion = "La recepción no puede ser antes de la compra.";
    }

    if (Object.keys(errores).length > 0) {
      throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
    }
    return { ...datos, transporteCentavos, fechaRecepcion: datos.fechaRecepcion ?? null };
  }

  return {
    async registrarProveedor(datos: DatosDeProveedor): Promise<Proveedor> {
      return db.proveedor.create({ data: validarProveedor(datos) });
    },

    /** Todos los proveedores, los últimos dados de alta primero. */
    async listarProveedores(): Promise<Proveedor[]> {
      return db.proveedor.findMany({ orderBy: { id: "desc" } });
    },

    /**
     * Registra un lote con su proveedor, canal, calidad declarada, costo,
     * transporte y fechas de compra y recepción. Todavía sin piezas: la
     * apertura (`abrirLote`) las crea.
     */
    async registrarLote(datos: DatosDeLote): Promise<LoteDelPanel> {
      const limpios = await validarLote(datos);
      const fila = await db.lote.create({
        data: {
          proveedorId: limpios.proveedorId,
          canal: CANAL_A_PRISMA[limpios.canal],
          calidadDeclaradaId: limpios.calidadDeclaradaId,
          costoCentavos: limpios.costoCentavos,
          transporteCentavos: limpios.transporteCentavos,
          fechaCompra: limpios.fechaCompra,
          fechaRecepcion: limpios.fechaRecepcion,
        },
      });
      return aLoteDelPanel(fila);
    },

    /** Todos los lotes, los últimos registrados primero. */
    async listarLotes(): Promise<LoteDelPanel[]> {
      const filas = await db.lote.findMany({ orderBy: { id: "desc" } });
      return Promise.all(filas.map(aLoteDelPanel));
    },

    /** Un lote por su id, o `null` si no existe. */
    async loteDelPanel(id: number): Promise<LoteDelPanel | null> {
      const fila = await db.lote.findUnique({ where: { id } });
      return fila ? aLoteDelPanel(fila) : null;
    },

    /**
     * Abre un lote: registra cuántas unidades llegaron, cuántas se
     * descartaron y la nota de apertura, y crea una pieza En preparación por
     * cada unidad recibida que no fue descarte, con la condición de ingreso
     * indicada. Un lote solo se abre una vez. Los descartes no generan pieza,
     * así que nunca reciben parte del costo del lote.
     */
    async abrirLote(
      id: number,
      datos: DatosDeApertura,
    ): Promise<{ lote: LoteDelPanel; piezas: PiezaDelPanel[] }> {
      await exigirLote(id);

      const errores: Record<string, string> = {};
      const { unidadesRecibidas, descartes, condicionesDeIngreso } = datos;

      const unidadesValidas =
        Number.isSafeInteger(unidadesRecibidas) &&
        unidadesRecibidas >= 0 &&
        unidadesRecibidas <= UNIDADES_MAXIMAS;
      if (!unidadesValidas) {
        errores.unidadesRecibidas = `Escribe un número entre 0 y ${UNIDADES_MAXIMAS}.`;
      }

      const descartesValidos =
        Number.isSafeInteger(descartes) &&
        descartes >= 0 &&
        (!unidadesValidas || descartes <= unidadesRecibidas);
      if (!descartesValidos) {
        errores.descartes = "Los descartes no pueden superar las unidades recibidas.";
      }

      if (unidadesValidas && descartesValidos) {
        const esperadas = unidadesRecibidas - descartes;
        if (condicionesDeIngreso.length !== esperadas) {
          errores.condicionesDeIngreso = `Escribe la condición de ingreso de las ${esperadas} piezas recibidas.`;
        } else if (!condicionesDeIngreso.every(esCondicionValida)) {
          errores.condicionesDeIngreso = "Elige una condición de la lista para cada pieza.";
        }
      }
      const notaApertura = datos.notaApertura?.trim().replace(/\s+/g, " ") || null;
      if (notaApertura && notaApertura.length > NOTA_MAXIMA) {
        errores.notaApertura = `Usa como máximo ${NOTA_MAXIMA} caracteres.`;
      }
      if (!(datos.fecha instanceof Date) || Number.isNaN(datos.fecha.getTime())) {
        errores.fecha = "Escribe una fecha de apertura válida.";
      }
      if (Object.keys(errores).length > 0) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
      }

      // El filtro por "todavía sin abrir" evita abrir el lote dos veces si dos
      // operadoras pulsan a la vez.
      const { count } = await db.lote.updateMany({
        where: { id, fechaApertura: null },
        data: {
          fechaApertura: datos.fecha,
          unidadesRecibidas,
          descartes,
          notaApertura,
        },
      });
      if (count === 0) {
        throw new ErrorDeDominio("transicion_no_permitida", `El lote ${id} ya fue abierto.`);
      }

      // Se crean todas las piezas primero y se leen de nuevo al final: el
      // costo de pieza se calcula con la cantidad final del lote, no con la
      // cantidad parcial que hay a mitad de la carga.
      const codigos: string[] = [];
      for (const condicionIngreso of condicionesDeIngreso) {
        codigos.push((await piezas.crearPieza({ loteId: id, condicionIngreso })).codigo);
      }
      const piezasCreadas = await Promise.all(
        codigos.map((codigo) => piezas.piezaDelPanel(codigo)),
      ) as PiezaDelPanel[];

      return { lote: await aLoteDelPanel(await exigirLote(id)), piezas: piezasCreadas };
    },

    /**
     * Registra la compra de una pieza a un particular, sin lote: el costo de
     * la pieza es directamente lo pagado por ella (ADR 0001).
     */
    async registrarCompraAParticular(
      datos: DatosDeCompraAParticular,
    ): Promise<PiezaDelPanel> {
      const errores: Record<string, string> = {};

      const proveedorExiste =
        Number.isSafeInteger(datos.proveedorId) &&
        datos.proveedorId > 0 &&
        (await db.proveedor.count({ where: { id: datos.proveedorId } })) > 0;
      if (!proveedorExiste) errores.proveedorId = "Elige un proveedor existente.";

      if (
        !(
          Number.isSafeInteger(datos.costoDirectoCentavos) &&
          datos.costoDirectoCentavos > 0
        )
      ) {
        errores.costoDirectoCentavos = "Escribe cuánto le pagaste por la pieza.";
      }

      if (datos.condicionIngreso != null && !esCondicionValida(datos.condicionIngreso)) {
        errores.condicionIngreso = "Elige una condición de la lista.";
      }

      if (Object.keys(errores).length > 0) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
      }

      return piezas.crearPieza({
        proveedorId: datos.proveedorId,
        costoDirectoCentavos: datos.costoDirectoCentavos,
        condicionIngreso: datos.condicionIngreso ?? null,
      });
    },
  };
}

export type Abastecimiento = ReturnType<typeof crearAbastecimiento>;
