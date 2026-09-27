import type { Prisma, PrismaClient } from "~/generated/prisma/client";

import { CANAL_DE_PRISMA, type CanalDeAbastecimiento } from "./abastecimiento";
import { CONDICIONES, condicionDePrisma, type CondicionDePieza } from "./condicion";
import { ErrorDeDominio } from "./errores";
import { repartoDeLote } from "./piezas";

/**
 * Rentabilidad por lote y por proveedor, y calidad detectada (ticket #11).
 * Todo es interno: nunca se publica.
 *
 * Se calcula al consultar. Las sumas y los conteos los hace Postgres (una sola
 * consulta agrupada por lote, proveedor, tipo, condición de ingreso y estado),
 * por el límite de CPU de Workers; aquí solo se reparten esos pocos grupos.
 *
 * Reglas:
 * - **Costo imputado de un lote** = costo + transporte + Σ reacondicionamientos
 *   de sus piezas + Σ costos de entrega de sus ventas. El costo de entrega lo
 *   paga la tienda, así que es un costo más de la pieza vendida.
 * - **Piezas retiradas**: conservan su parte del costo del lote (el reparto
 *   del ADR 0001 no se recalcula) y su reacondicionamiento, sin ingreso. Ya no
 *   cuentan como piezas sin vender, así que un lote con todas sus piezas
 *   vendidas o retiradas está terminado. Las retiradas como irrecuperable
 *   cuentan además como descarte en la calidad detectada.
 * - **Desglose** (tipo, condición de ingreso): cada pieza carga su reparto
 *   (`repartoDeLote`) más su reacondicionamiento y su entrega. Por el redondeo
 *   del reparto al centavo, la suma del desglose puede diferir en centavos
 *   del costo imputado del lote.
 * - **Proveedor**: el agregado de sus lotes más sus compras a particular
 *   (costo directo + reacondicionamiento + entrega).
 */

export type EstadoDelLote = "sin_abrir" | "en_curso" | "terminado";

/** Las cifras que se repiten en cada nivel: lote, proveedor y fila de desglose. */
export interface CifrasDeRentabilidad {
  piezas: number;
  vendidas: number;
  retiradas: number;
  /** En preparación, Disponibles o Reservadas. */
  sinVender: number;
  /** Σ precios finales de las vendidas. */
  ingresosCentavos: number;
  costoImputadoCentavos: number;
  /** Ingresos − costo imputado: la rentabilidad cuando ya no queda nada sin vender. */
  margenCentavos: number;
}

export interface CalidadDetectada {
  /** Piezas por condición de ingreso (todas: vendidas, retiradas y sin vender). */
  condiciones: Record<CondicionDePieza, number>;
  sinCondicion: number;
  /** `null` en un lote sin abrir. */
  unidadesRecibidas: number | null;
  /** Descartes de la apertura más retiradas como irrecuperable. */
  descartes: number;
  /** Descartes ÷ unidades recibidas, en %, con un decimal. `null` sin apertura. */
  porcentajeDescarte: number | null;
}

export interface RentabilidadDeLote extends CifrasDeRentabilidad {
  id: number;
  proveedorId: number;
  proveedorNombre: string;
  canal: CanalDeAbastecimiento;
  calidadDeclaradaNombre: string;
  fechaCompra: Date;
  estado: EstadoDelLote;
  /** Costo + transporte del lote. */
  costoLoteCentavos: number;
  reacondicionamientoCentavos: number;
  entregasCentavos: number;
  /** Ingresos ÷ costo imputado, en %, con un decimal. */
  porcentajeRecuperado: number;
  calidadDetectada: CalidadDetectada;
}

export interface FilaPorTipo extends CifrasDeRentabilidad {
  /** `null`: piezas sin tipo cargado. */
  nombre: string | null;
}

export interface FilaPorCondicion extends CifrasDeRentabilidad {
  /** `null`: piezas sin condición de ingreso. */
  condicion: CondicionDePieza | null;
}

export interface DesgloseDeRentabilidad {
  porTipo: FilaPorTipo[];
  porCondicion: FilaPorCondicion[];
}

export interface RentabilidadDeProveedor extends CifrasDeRentabilidad {
  id: number;
  nombre: string;
  lotes: number;
  comprasAParticular: number;
  porcentajeRecuperado: number;
  /** De sus lotes (una compra a particular no tiene calidad declarada). */
  calidadDetectada: CalidadDetectada;
}

export interface CalidadPorDeclarada {
  calidadDeclaradaNombre: string;
  lotes: number;
  calidadDetectada: CalidadDetectada;
}

export interface DetalleDeProveedor extends RentabilidadDeProveedor, DesgloseDeRentabilidad {
  detalleDeLotes: RentabilidadDeLote[];
  calidadPorDeclarada: CalidadPorDeclarada[];
}

export type DetalleDeLote = RentabilidadDeLote & DesgloseDeRentabilidad;

/** Por fecha de compra del lote (o de registro, en una compra a particular). */
export interface FiltrosDeRentabilidad {
  /** Desde este día, incluido. */
  desde?: Date | null;
  /** Hasta este día, incluido. */
  hasta?: Date | null;
}

const FECHA_MINIMA = new Date("2000-01-01T00:00:00Z");
const FECHA_MAXIMA = new Date("2100-01-01T00:00:00Z");
const DIA_MS = 24 * 60 * 60 * 1000;
/** El mayor id de una columna `integer` de Postgres. */
const ID_MAXIMO = 2_147_483_647;

function esIdValido(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0 && id <= ID_MAXIMO;
}

function validarFiltros(filtros: FiltrosDeRentabilidad): { desde: Date | null; antesDe: Date | null } {
  const errores: Record<string, string> = {};
  const revisar = (campo: "desde" | "hasta", valor: Date | null | undefined) => {
    if (valor == null) return null;
    if (!(valor instanceof Date) || Number.isNaN(valor.getTime())) {
      errores[campo] = "Escribe una fecha válida.";
      return null;
    }
    if (valor < FECHA_MINIMA || valor >= FECHA_MAXIMA) {
      errores[campo] = "Usa una fecha entre 2000 y 2099.";
      return null;
    }
    return valor;
  };
  const desde = revisar("desde", filtros.desde);
  const hasta = revisar("hasta", filtros.hasta);
  if (desde && hasta && hasta < desde) {
    errores.hasta = "La fecha final no puede ser antes de la inicial.";
  }
  if (Object.keys(errores).length > 0) {
    throw new ErrorDeDominio("datos_invalidos", "Revisa las fechas del filtro.", errores);
  }
  return { desde, antesDe: hasta ? new Date(hasta.getTime() + DIA_MS) : null };
}

/** `parte ÷ total` en %, con un decimal. */
function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte * 1000) / total) / 10 : 0;
}

// --- Consulta agrupada ------------------------------------------------------

type EstadoDePrisma = "EN_PREPARACION" | "DISPONIBLE" | "RESERVADA" | "VENDIDA" | "RETIRADA";

/** Un grupo de piezas con el mismo lote, proveedor, tipo, condición y estado. */
interface GrupoDePiezas {
  loteId: number | null;
  proveedorId: number;
  tipoId: number | null;
  condicion: CondicionDePieza | null;
  estado: EstadoDePrisma;
  irrecuperables: number;
  piezas: number;
  reacondicionamientoCentavos: number;
  costoDirectoCentavos: number;
  ingresosCentavos: number;
  entregasCentavos: number;
}

interface FiltroDeConsulta {
  desde: Date | null;
  antesDe: Date | null;
  loteId?: number;
  proveedorId?: number;
}

async function gruposDePiezas(db: PrismaClient, filtro: FiltroDeConsulta): Promise<GrupoDePiezas[]> {
  // Cada filtro ausente viaja como NULL y su condición se anula: una sola
  // consulta fija, con todos los valores como parámetros. No se usa
  // `Prisma.sql`: importar `Prisma` como valor mete el cliente generado (y su
  // wasm) en el bundle del navegador, porque las rutas importan de `~/dominio`.
  const desde = filtro.desde ?? null;
  const antesDe = filtro.antesDe ?? null;
  const loteId = filtro.loteId ?? null;
  const proveedorId = filtro.proveedorId ?? null;

  const filas = await db.$queryRaw<
    {
      loteId: number | null;
      proveedorId: number;
      tipoId: number | null;
      condicion: string | null;
      estado: EstadoDePrisma;
      irrecuperables: bigint | number;
      piezas: bigint | number;
      reacondicionamiento: bigint | number;
      directo: bigint | number;
      ingresos: bigint | number;
      entregas: bigint | number;
    }[]
  >`
    SELECT
      p.lote_id AS "loteId",
      COALESCE(l.proveedor_id, p.proveedor_id) AS "proveedorId",
      p.tipo_id AS "tipoId",
      p.condicion_ingreso::text AS "condicion",
      p.estado::text AS "estado",
      COUNT(*) FILTER (WHERE r.motivo = 'IRRECUPERABLE')::bigint AS "irrecuperables",
      COUNT(*)::bigint AS "piezas",
      COALESCE(SUM(p.costo_reacondicionamiento_centavos), 0)::bigint AS "reacondicionamiento",
      COALESCE(SUM(p.costo_directo_centavos) FILTER (WHERE p.lote_id IS NULL), 0)::bigint AS "directo",
      COALESCE(SUM(v.precio_final_centavos), 0)::bigint AS "ingresos",
      COALESCE(SUM(v.costo_entrega_centavos), 0)::bigint AS "entregas"
    FROM pieza p
    LEFT JOIN lote l ON l.id = p.lote_id
    LEFT JOIN venta v ON v.pieza_id = p.id
    LEFT JOIN retiro r ON r.pieza_id = p.id
    -- Solo piezas con procedencia: de un lote o de una compra a particular.
    WHERE (p.lote_id IS NOT NULL OR (p.proveedor_id IS NOT NULL AND p.costo_directo_centavos IS NOT NULL))
      AND (${desde}::timestamp IS NULL OR COALESCE(l.fecha_compra, p.creada_en) >= ${desde}::timestamp)
      AND (${antesDe}::timestamp IS NULL OR COALESCE(l.fecha_compra, p.creada_en) < ${antesDe}::timestamp)
      AND (${loteId}::int IS NULL OR p.lote_id = ${loteId}::int)
      AND (${proveedorId}::int IS NULL OR COALESCE(l.proveedor_id, p.proveedor_id) = ${proveedorId}::int)
    GROUP BY 1, 2, 3, 4, 5
  `;

  return filas.map((fila) => ({
    loteId: fila.loteId === null ? null : Number(fila.loteId),
    proveedorId: Number(fila.proveedorId),
    tipoId: fila.tipoId === null ? null : Number(fila.tipoId),
    condicion:
      fila.condicion === null
        ? null
        : condicionDePrisma(fila.condicion as Parameters<typeof condicionDePrisma>[0]),
    estado: fila.estado,
    irrecuperables: Number(fila.irrecuperables),
    piezas: Number(fila.piezas),
    reacondicionamientoCentavos: Number(fila.reacondicionamiento),
    costoDirectoCentavos: Number(fila.directo),
    ingresosCentavos: Number(fila.ingresos),
    entregasCentavos: Number(fila.entregas),
  }));
}

// --- Cálculo ----------------------------------------------------------------

function cifrasVacias(): CifrasDeRentabilidad {
  return {
    piezas: 0,
    vendidas: 0,
    retiradas: 0,
    sinVender: 0,
    ingresosCentavos: 0,
    costoImputadoCentavos: 0,
    margenCentavos: 0,
  };
}

/** Suma los conteos e ingresos de un grupo, y el costo que se le imputa. */
function sumarGrupo(cifras: CifrasDeRentabilidad, grupo: GrupoDePiezas, costoCentavos: number) {
  cifras.piezas += grupo.piezas;
  if (grupo.estado === "VENDIDA") cifras.vendidas += grupo.piezas;
  else if (grupo.estado === "RETIRADA") cifras.retiradas += grupo.piezas;
  else cifras.sinVender += grupo.piezas;
  cifras.ingresosCentavos += grupo.ingresosCentavos;
  cifras.costoImputadoCentavos += costoCentavos;
  cifras.margenCentavos = cifras.ingresosCentavos - cifras.costoImputadoCentavos;
}

function calidadVacia(): CalidadDetectada {
  return {
    condiciones: { excelente: 0, muy_buena: 0, buena: 0, con_detalles: 0 },
    sinCondicion: 0,
    unidadesRecibidas: null,
    descartes: 0,
    porcentajeDescarte: null,
  };
}

function sumarCalidad(destino: CalidadDetectada, origen: CalidadDetectada) {
  for (const condicion of CONDICIONES) destino.condiciones[condicion] += origen.condiciones[condicion];
  destino.sinCondicion += origen.sinCondicion;
  destino.descartes += origen.descartes;
  if (origen.unidadesRecibidas !== null) {
    destino.unidadesRecibidas = (destino.unidadesRecibidas ?? 0) + origen.unidadesRecibidas;
  }
  destino.porcentajeDescarte =
    destino.unidadesRecibidas === null
      ? null
      : porcentaje(destino.descartes, destino.unidadesRecibidas);
}

type FilaDeLote = Prisma.LoteGetPayload<{
  include: { proveedor: { select: { nombre: true } }; calidadDeclarada: { select: { nombre: true } } };
}>;

/** Datos del lote que necesita el cálculo del costo de cada pieza. */
interface CostoDeLote {
  totalCentavos: number;
  piezas: number;
}

/** Cuánto le cuesta al grupo: reparto o costo directo, más reacondicionamiento y entregas. */
function costoDelGrupo(grupo: GrupoDePiezas, lotes: Map<number, CostoDeLote>): number {
  const base =
    grupo.loteId === null
      ? grupo.costoDirectoCentavos
      : (() => {
          const lote = lotes.get(grupo.loteId);
          return lote ? repartoDeLote(lote.totalCentavos, lote.piezas) * grupo.piezas : 0;
        })();
  return base + grupo.reacondicionamientoCentavos + grupo.entregasCentavos;
}

function rentabilidadDeUnLote(fila: FilaDeLote, grupos: GrupoDePiezas[]): RentabilidadDeLote {
  const costoLoteCentavos = fila.costoCentavos + fila.transporteCentavos;
  const cifras = cifrasVacias();
  const calidad = calidadVacia();
  let reacondicionamientoCentavos = 0;
  let entregasCentavos = 0;
  let irrecuperables = 0;

  for (const grupo of grupos) {
    sumarGrupo(cifras, grupo, 0);
    reacondicionamientoCentavos += grupo.reacondicionamientoCentavos;
    entregasCentavos += grupo.entregasCentavos;
    irrecuperables += grupo.irrecuperables;
    if (grupo.condicion) calidad.condiciones[grupo.condicion] += grupo.piezas;
    else calidad.sinCondicion += grupo.piezas;
  }
  cifras.costoImputadoCentavos = costoLoteCentavos + reacondicionamientoCentavos + entregasCentavos;
  cifras.margenCentavos = cifras.ingresosCentavos - cifras.costoImputadoCentavos;

  const abierto = fila.fechaApertura !== null;
  if (abierto) {
    calidad.unidadesRecibidas = fila.unidadesRecibidas ?? 0;
    calidad.descartes = (fila.descartes ?? 0) + irrecuperables;
    calidad.porcentajeDescarte = porcentaje(calidad.descartes, calidad.unidadesRecibidas);
  }

  return {
    id: fila.id,
    proveedorId: fila.proveedorId,
    proveedorNombre: fila.proveedor.nombre,
    canal: CANAL_DE_PRISMA[fila.canal],
    calidadDeclaradaNombre: fila.calidadDeclarada.nombre,
    fechaCompra: fila.fechaCompra,
    estado: !abierto ? "sin_abrir" : cifras.sinVender > 0 ? "en_curso" : "terminado",
    costoLoteCentavos,
    reacondicionamientoCentavos,
    entregasCentavos,
    porcentajeRecuperado: porcentaje(cifras.ingresosCentavos, cifras.costoImputadoCentavos),
    calidadDetectada: calidad,
    ...cifras,
  };
}

async function nombresDeTipos(db: PrismaClient): Promise<Map<number, string>> {
  const tipos = await db.tipoDeCartera.findMany({ select: { id: true, nombre: true } });
  return new Map(tipos.map((t) => [t.id, t.nombre]));
}

function desglose(
  grupos: GrupoDePiezas[],
  lotes: Map<number, CostoDeLote>,
  tipos: Map<number, string>,
): DesgloseDeRentabilidad {
  const porTipo = new Map<number | null, CifrasDeRentabilidad>();
  const porCondicion = new Map<CondicionDePieza | null, CifrasDeRentabilidad>();
  for (const grupo of grupos) {
    const costo = costoDelGrupo(grupo, lotes);
    if (!porTipo.has(grupo.tipoId)) porTipo.set(grupo.tipoId, cifrasVacias());
    sumarGrupo(porTipo.get(grupo.tipoId)!, grupo, costo);
    if (!porCondicion.has(grupo.condicion)) porCondicion.set(grupo.condicion, cifrasVacias());
    sumarGrupo(porCondicion.get(grupo.condicion)!, grupo, costo);
  }

  // Tipos en su orden de alta y, al final, las piezas sin tipo.
  const ordenDeTipos = [...tipos.keys()].sort((a, b) => a - b);
  const filasPorTipo: FilaPorTipo[] = [...ordenDeTipos, null]
    .filter((id) => porTipo.has(id))
    .map((id) => ({ nombre: id === null ? null : (tipos.get(id) ?? null), ...porTipo.get(id)! }));

  // Condiciones en el orden de la escala y, al final, las piezas sin condición.
  const filasPorCondicion: FilaPorCondicion[] = [...CONDICIONES, null]
    .filter((c) => porCondicion.has(c))
    .map((condicion) => ({ condicion, ...porCondicion.get(condicion)! }));

  return { porTipo: filasPorTipo, porCondicion: filasPorCondicion };
}

function costosDeLotes(filas: FilaDeLote[], grupos: GrupoDePiezas[]): Map<number, CostoDeLote> {
  const lotes = new Map<number, CostoDeLote>(
    filas.map((f) => [f.id, { totalCentavos: f.costoCentavos + f.transporteCentavos, piezas: 0 }]),
  );
  for (const grupo of grupos) {
    if (grupo.loteId !== null) {
      const lote = lotes.get(grupo.loteId);
      if (lote) lote.piezas += grupo.piezas;
    }
  }
  return lotes;
}

const INCLUIR_NOMBRES = {
  proveedor: { select: { nombre: true } },
  calidadDeclarada: { select: { nombre: true } },
} as const;

function filtroDeFechaDeLote(filtro: { desde: Date | null; antesDe: Date | null }) {
  if (!filtro.desde && !filtro.antesDe) return {};
  return {
    fechaCompra: {
      ...(filtro.desde ? { gte: filtro.desde } : {}),
      ...(filtro.antesDe ? { lt: filtro.antesDe } : {}),
    },
  };
}

// --- Operaciones ------------------------------------------------------------

export function crearRentabilidad(db: PrismaClient) {
  /** Lotes y grupos de piezas de un alcance, ya filtrados. */
  async function datos(filtro: FiltroDeConsulta) {
    const [filasDeLote, grupos] = await Promise.all([
      db.lote.findMany({
        where: {
          ...filtroDeFechaDeLote(filtro),
          ...(filtro.loteId !== undefined ? { id: filtro.loteId } : {}),
          ...(filtro.proveedorId !== undefined ? { proveedorId: filtro.proveedorId } : {}),
        },
        include: INCLUIR_NOMBRES,
        orderBy: { id: "desc" },
      }),
      gruposDePiezas(db, filtro),
    ]);
    return { filasDeLote, grupos };
  }

  function rentabilidadesDeLotes(filasDeLote: FilaDeLote[], grupos: GrupoDePiezas[]) {
    const porLote = new Map<number, GrupoDePiezas[]>();
    for (const grupo of grupos) {
      if (grupo.loteId === null) continue;
      if (!porLote.has(grupo.loteId)) porLote.set(grupo.loteId, []);
      porLote.get(grupo.loteId)!.push(grupo);
    }
    return filasDeLote.map((fila) => rentabilidadDeUnLote(fila, porLote.get(fila.id) ?? []));
  }

  /** El agregado de un proveedor: sus lotes más sus compras a particular. */
  function agregarProveedor(
    proveedor: { id: number; nombre: string },
    lotes: RentabilidadDeLote[],
    grupos: GrupoDePiezas[],
  ): RentabilidadDeProveedor {
    const cifras = cifrasVacias();
    const calidad = calidadVacia();
    for (const lote of lotes) {
      cifras.piezas += lote.piezas;
      cifras.vendidas += lote.vendidas;
      cifras.retiradas += lote.retiradas;
      cifras.sinVender += lote.sinVender;
      cifras.ingresosCentavos += lote.ingresosCentavos;
      cifras.costoImputadoCentavos += lote.costoImputadoCentavos;
      sumarCalidad(calidad, lote.calidadDetectada);
    }
    let comprasAParticular = 0;
    for (const grupo of grupos) {
      if (grupo.loteId !== null) continue;
      comprasAParticular += grupo.piezas;
      sumarGrupo(cifras, grupo, costoDelGrupo(grupo, new Map()));
    }
    cifras.margenCentavos = cifras.ingresosCentavos - cifras.costoImputadoCentavos;
    return {
      id: proveedor.id,
      nombre: proveedor.nombre,
      lotes: lotes.length,
      comprasAParticular,
      porcentajeRecuperado: porcentaje(cifras.ingresosCentavos, cifras.costoImputadoCentavos),
      calidadDetectada: calidad,
      ...cifras,
    };
  }

  return {
    /** La rentabilidad de cada lote, los últimos registrados primero. */
    async rentabilidadDeLotes(filtros: FiltrosDeRentabilidad = {}): Promise<RentabilidadDeLote[]> {
      const { filasDeLote, grupos } = await datos(validarFiltros(filtros));
      return rentabilidadesDeLotes(filasDeLote, grupos);
    },

    /** La rentabilidad de un lote con su desglose, o `null` si no existe. */
    async rentabilidadDeLote(id: number): Promise<DetalleDeLote | null> {
      if (!esIdValido(id)) return null;
      const [{ filasDeLote, grupos }, tipos] = await Promise.all([
        datos({ desde: null, antesDe: null, loteId: id }),
        nombresDeTipos(db),
      ]);
      const [fila] = filasDeLote;
      if (!fila) return null;
      return {
        ...rentabilidadDeUnLote(fila, grupos),
        ...desglose(grupos, costosDeLotes(filasDeLote, grupos), tipos),
      };
    },

    /**
     * La rentabilidad de cada proveedor con algo comprado en el rango, los
     * últimos dados de alta primero.
     */
    async rentabilidadDeProveedores(
      filtros: FiltrosDeRentabilidad = {},
    ): Promise<RentabilidadDeProveedor[]> {
      const { filasDeLote, grupos } = await datos(validarFiltros(filtros));
      const lotes = rentabilidadesDeLotes(filasDeLote, grupos);
      const ids = new Set([...lotes.map((l) => l.proveedorId), ...grupos.map((g) => g.proveedorId)]);
      const proveedores = await db.proveedor.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, nombre: true },
        orderBy: { id: "desc" },
      });
      return proveedores.map((proveedor) =>
        agregarProveedor(
          proveedor,
          lotes.filter((l) => l.proveedorId === proveedor.id),
          grupos.filter((g) => g.proveedorId === proveedor.id),
        ),
      );
    },

    /**
     * La rentabilidad de un proveedor con sus lotes, su desglose y la calidad
     * detectada junto a cada calidad declarada, o `null` si no existe.
     */
    async rentabilidadDeProveedor(
      id: number,
      filtros: FiltrosDeRentabilidad = {},
    ): Promise<DetalleDeProveedor | null> {
      if (!esIdValido(id)) return null;
      const filtro = validarFiltros(filtros);
      const proveedor = await db.proveedor.findUnique({
        where: { id },
        select: { id: true, nombre: true },
      });
      if (!proveedor) return null;
      const [{ filasDeLote, grupos }, tipos] = await Promise.all([
        datos({ ...filtro, proveedorId: id }),
        nombresDeTipos(db),
      ]);
      const detalleDeLotes = rentabilidadesDeLotes(filasDeLote, grupos);

      const porDeclarada = new Map<string, CalidadPorDeclarada>();
      for (const lote of detalleDeLotes) {
        const nombre = lote.calidadDeclaradaNombre;
        if (!porDeclarada.has(nombre)) {
          porDeclarada.set(nombre, { calidadDeclaradaNombre: nombre, lotes: 0, calidadDetectada: calidadVacia() });
        }
        const fila = porDeclarada.get(nombre)!;
        fila.lotes += 1;
        sumarCalidad(fila.calidadDetectada, lote.calidadDetectada);
      }
      // En el orden de la lista de calidades declaradas (Primera, Segunda…).
      const ordenDeCalidades = await db.calidadDeclarada.findMany({
        select: { nombre: true },
        orderBy: { id: "asc" },
      });

      return {
        ...agregarProveedor(proveedor, detalleDeLotes, grupos),
        ...desglose(grupos, costosDeLotes(filasDeLote, grupos), tipos),
        detalleDeLotes,
        calidadPorDeclarada: ordenDeCalidades
          .map((c) => porDeclarada.get(c.nombre))
          .filter((c): c is CalidadPorDeclarada => c !== undefined),
      };
    },
  };
}
