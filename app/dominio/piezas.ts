import type {
  EstadoPieza,
  Prisma,
  PrismaClient,
} from "~/generated/prisma/client";

import {
  condicionAPrisma,
  condicionDePrisma,
  esCondicionValida,
  type CondicionDePieza,
} from "./condicion";
import { ErrorDeDominio } from "./errores";
import {
  fotosPublicasDesde,
  mensajeDeTomasFaltantes,
  tomasFaltantes as tomasFaltantesDe,
  type FotoPublica,
  type TipoDeToma,
} from "./fotos";
import {
  formatearCodigo,
  numeroDeCodigo,
  rutaPublica,
  sufijoAleatorio,
  sufijoDeDireccion,
  uuidV7,
} from "./identificadores";
import {
  rangoDeTamano,
  TAMANOS,
  tamanoPorAncho,
  type Tamano,
  type UmbralesDeTamano,
} from "./tamano";

/** Lo que el dominio necesita saber de la tienda y del reloj. */
export interface ConfiguracionDePiezas {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
  umbralesDeTamano: UmbralesDeTamano;
  /** La hora actual. Las pruebas la fijan. */
  ahora: () => Date;
}

/** Estado de pieza, tal como se nombra fuera del dominio. */
export type EstadoDePieza =
  | "en_preparacion"
  | "disponible"
  | "reservada"
  | "vendida"
  | "retirada";

const nombreDeEstado = {
  EN_PREPARACION: "en_preparacion",
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
  VENDIDA: "vendida",
  RETIRADA: "retirada",
} as const satisfies Record<EstadoPieza, EstadoDePieza>;

/**
 * Los datos que la operadora carga en una pieza. En `crearPieza` y
 * `editarPieza`, un campo ausente no cambia y `null` lo borra. Las medidas
 * van en cm; el precio publicado, en centavos de boliviano.
 */
export interface DatosDePieza {
  nombre?: string | null;
  tipoId?: number | null;
  colorId?: number | null;
  materialId?: number | null;
  altoCm?: number | null;
  anchoCm?: number | null;
  profundidadCm?: number | null;
  caidaCm?: number | null;
  precioCentavos?: number | null;

  // --- Procedencia y costo (#8, ADR 0001) -----------------------------------
  /** El lote del que viene la pieza. Excluyente con `proveedorId` directo. */
  loteId?: number | null;
  /** Proveedor directo, solo en una compra a particular (sin lote). */
  proveedorId?: number | null;
  /** Lo pagado por la pieza en una compra a particular, sin lote. */
  costoDirectoCentavos?: number | null;
  /** Costo de limpieza o reparación de esta pieza. Nunca `null`: sin costo es 0. */
  costoReacondicionamientoCentavos?: number;
  /** Condición asignada en la apertura del lote o en la compra a particular. */
  condicionIngreso?: CondicionDePieza | null;
}

export type CampoDePieza = keyof DatosDePieza;

/** Sin estos datos una pieza no se publica. La caída es opcional. */
const CAMPOS_OBLIGATORIOS = [
  "nombre",
  "tipoId",
  "colorId",
  "materialId",
  "altoCm",
  "anchoCm",
  "profundidadCm",
  "precioCentavos",
] as const satisfies readonly CampoDePieza[];

const MEDIDAS = ["altoCm", "anchoCm", "profundidadCm", "caidaCm"] as const;

/** Tope de una medida (y de la caída), en cm: ninguna cartera pasa de 3 m. */
const MEDIDA_MAXIMA_CM = 300;
/**
 * Tope del precio publicado: Bs 100.000, en centavos. Muy por encima de
 * cualquier cartera y muy por debajo del máximo de la columna (INTEGER).
 */
export const PRECIO_MAXIMO_CENTAVOS = 10_000_000;
/** Tope del costo directo (compra a particular): igual que el precio máximo. */
const COSTO_DIRECTO_MAXIMO_CENTAVOS = 10_000_000;
/** Tope del reacondicionamiento: Bs 5.000, en centavos. */
const REACONDICIONAMIENTO_MAXIMO_CENTAVOS = 500_000;

const NOMBRE_DEL_CAMPO: Record<CampoDePieza, string> = {
  nombre: "el nombre",
  tipoId: "el tipo",
  colorId: "el color",
  materialId: "el material",
  altoCm: "el alto",
  anchoCm: "el ancho",
  profundidadCm: "la profundidad",
  caidaCm: "la caída",
  precioCentavos: "el precio",
  loteId: "el lote",
  proveedorId: "el proveedor",
  costoDirectoCentavos: "el costo directo",
  costoReacondicionamientoCentavos: "el reacondicionamiento",
  condicionIngreso: "la condición de ingreso",
};

/** Una pieza tal como la ve la operadora en el panel. */
export interface PiezaDelPanel {
  codigo: string;
  estado: EstadoDePieza;
  nombre: string | null;
  tipoId: number | null;
  colorId: number | null;
  materialId: number | null;
  altoCm: number | null;
  anchoCm: number | null;
  profundidadCm: number | null;
  caidaCm: number | null;
  precioCentavos: number | null;
  /** Derivado del ancho con los umbrales vigentes. */
  tamano: Tamano | null;
  publicadaEn: Date | null;
  /** La URL pública; solo responde cuando la pieza está publicada. */
  rutaPublica: string;
  /** Datos obligatorios que todavía faltan para publicar. */
  faltanParaPublicar: CampoDePieza[];
  /** De las 8 tomas mínimas, las que todavía no se cargaron. */
  tomasFaltantes: TipoDeToma[];

  // --- Procedencia y costo (#8, ADR 0001): nunca se publican ----------------
  loteId: number | null;
  proveedorId: number | null;
  costoDirectoCentavos: number | null;
  costoReacondicionamientoCentavos: number;
  condicionIngreso: CondicionDePieza | null;
  /**
   * (costo del lote + transporte) ÷ piezas del lote + reacondicionamiento, o
   * costo directo + reacondicionamiento en una compra a particular. `null`
   * mientras la pieza no tenga procedencia (piezas creadas fuera de #8).
   */
  costoDePiezaCentavos: number | null;
}

/** Una fila del listado de piezas del panel. */
export interface PiezaEnPanel {
  codigo: string;
  nombre: string | null;
  estado: EstadoDePieza;
  precioCentavos: number | null;
}

/**
 * Lo único que la compradora ve de una pieza. Sale solo de `fichaPublica`:
 * nunca lleva el ID interno ni datos del panel (y, cuando existan, tampoco
 * lote, proveedor, costo ni condición de ingreso).
 */
export interface FichaPublica {
  /** "VT-0001": la Ref. que la compradora nombra por WhatsApp. */
  codigo: string;
  nombre: string;
  /** La ruta vigente, `/carteras/<slug>-<sufijo>`. */
  ruta: string;
  estado: Exclude<EstadoDePieza, "en_preparacion">;
  tipo: string;
  color: string;
  material: string;
  medidas: {
    altoCm: number;
    anchoCm: number;
    profundidadCm: number;
    caidaCm: number | null;
  };
  tamano: { nombre: Tamano; rango: string };
  /** Los umbrales vigentes de cada tamaño, que la ficha publica. */
  tamanos: { nombre: Tamano; rango: string }[];
  precioCentavos: number;
  publicadaEn: Date;
  /**
   * Si está Reservada, hasta cuándo (el sello dice "hasta las 16:40"). De la
   * reserva no se publica nada más: ni la compradora ni su contador.
   */
  reservadaHasta: Date | null;
  /** Las 8 fotos, en el orden fijo de las tomas. Siempre una es `portada`. */
  fotos: FotoPublica[];
}

type FilaDePieza = Prisma.PiezaGetPayload<{ include: { fotos: true } }>;

// --- Validación ------------------------------------------------------------

/** Limpia y valida los datos; devuelve solo los campos presentes. */
async function validar(
  db: PrismaClient,
  datos: DatosDePieza,
): Promise<DatosDePieza> {
  const errores: Record<string, string> = {};
  const limpios: DatosDePieza = {};

  if (datos.nombre !== undefined) {
    const nombre = datos.nombre?.trim().replace(/\s+/g, " ") || null;
    if (nombre && nombre.length > 80) {
      errores.nombre = "Usa como máximo 80 caracteres.";
    }
    limpios.nombre = nombre;
  }

  for (const medida of MEDIDAS) {
    const valor = datos[medida];
    if (valor === undefined) continue;
    if (valor !== null && !(Number.isFinite(valor) && valor > 0 && valor <= MEDIDA_MAXIMA_CM)) {
      errores[medida] = `Escribe una medida en cm entre 0 y ${MEDIDA_MAXIMA_CM}.`;
    }
    limpios[medida] = valor;
  }

  if (datos.precioCentavos !== undefined) {
    const precio = datos.precioCentavos;
    if (
      precio !== null &&
      !(
        Number.isSafeInteger(precio) &&
        precio > 0 &&
        precio <= PRECIO_MAXIMO_CENTAVOS
      )
    ) {
      errores.precioCentavos = `Escribe un precio mayor que 0 y de hasta Bs ${(
        PRECIO_MAXIMO_CENTAVOS / 100
      ).toLocaleString("es-BO")}.`;
    }
    limpios.precioCentavos = precio;
  }

  const listas = [
    ["tipoId", (id: number) => db.tipoDeCartera.count({ where: { id } }), "Elige un tipo de la lista."],
    ["colorId", (id: number) => db.color.count({ where: { id } }), "Elige un color de la lista."],
    ["materialId", (id: number) => db.material.count({ where: { id } }), "Elige un material de la lista."],
    ["loteId", (id: number) => db.lote.count({ where: { id } }), "Elige un lote existente."],
    ["proveedorId", (id: number) => db.proveedor.count({ where: { id } }), "Elige un proveedor existente."],
  ] as const;
  for (const [campo, contar, mensaje] of listas) {
    const id = datos[campo];
    if (id === undefined) continue;
    if (id !== null) {
      const existe =
        Number.isSafeInteger(id) &&
        id > 0 &&
        id <= 2_147_483_647 &&
        (await contar(id)) > 0;
      if (!existe) errores[campo] = mensaje;
    }
    limpios[campo] = id;
  }

  if (datos.costoDirectoCentavos !== undefined) {
    const valor = datos.costoDirectoCentavos;
    if (
      valor !== null &&
      !(Number.isSafeInteger(valor) && valor > 0 && valor <= COSTO_DIRECTO_MAXIMO_CENTAVOS)
    ) {
      errores.costoDirectoCentavos = `Escribe un costo mayor que 0 y de hasta Bs ${(
        COSTO_DIRECTO_MAXIMO_CENTAVOS / 100
      ).toLocaleString("es-BO")}.`;
    }
    limpios.costoDirectoCentavos = valor;
  }

  if (datos.costoReacondicionamientoCentavos !== undefined) {
    const valor = datos.costoReacondicionamientoCentavos;
    if (
      !(
        Number.isSafeInteger(valor) &&
        valor >= 0 &&
        valor <= REACONDICIONAMIENTO_MAXIMO_CENTAVOS
      )
    ) {
      errores.costoReacondicionamientoCentavos = `Escribe un monto entre 0 y Bs ${(
        REACONDICIONAMIENTO_MAXIMO_CENTAVOS / 100
      ).toLocaleString("es-BO")}.`;
    }
    limpios.costoReacondicionamientoCentavos = valor;
  }

  if (datos.condicionIngreso !== undefined) {
    const condicion = datos.condicionIngreso;
    if (condicion !== null && !esCondicionValida(condicion)) {
      errores.condicionIngreso = "Elige una condición de la lista.";
    }
    limpios.condicionIngreso = condicion;
  }

  if (Object.keys(errores).length > 0) {
    throw new ErrorDeDominio(
      "datos_invalidos",
      "Revisa los datos marcados.",
      errores,
    );
  }
  return limpios;
}

/**
 * Solo mira los campos obligatorios para publicar (nunca la procedencia, que
 * usa otro tipo de condición en la fila cruda de Prisma).
 */
function faltantes(
  pieza: Required<Pick<DatosDePieza, (typeof CAMPOS_OBLIGATORIOS)[number]>>,
): CampoDePieza[] {
  return CAMPOS_OBLIGATORIOS.filter((campo) => pieza[campo] === null);
}

function erroresDeFaltantes(campos: CampoDePieza[], motivo: string) {
  return Object.fromEntries(
    campos.map((campo) => [
      campo,
      `Falta ${NOMBRE_DEL_CAMPO[campo]}${motivo}.`,
    ]),
  );
}

// --- Operaciones -----------------------------------------------------------

/**
 * Convierte los datos limpios del dominio a lo que espera Prisma: solo
 * `condicionIngreso` cambia de forma (nuestro string en minúsculas al enum de
 * Prisma en mayúsculas).
 */
function aDatosPrisma(
  datos: DatosDePieza,
): Omit<DatosDePieza, "condicionIngreso"> & {
  condicionIngreso?: ReturnType<typeof condicionAPrisma> | null;
} {
  const { condicionIngreso, ...resto } = datos;
  if (condicionIngreso === undefined) return resto;
  return {
    ...resto,
    condicionIngreso: condicionIngreso === null ? null : condicionAPrisma(condicionIngreso),
  };
}

export function crearPiezas(db: PrismaClient, config: ConfiguracionDePiezas) {
  const codigoDe = (numero: number) =>
    formatearCodigo(numero, config.prefijoDeCodigo);

  /**
   * El costo de pieza (ADR 0001): el reparto del costo de su lote (más
   * transporte, entre sus piezas: los descartes no generan fila y por eso no
   * reciben parte) más su reacondicionamiento, o el costo directo más
   * reacondicionamiento en una compra a particular. `null` sin procedencia.
   */
  async function costoDePiezaCentavos(fila: FilaDePieza): Promise<number | null> {
    const reacondicionamiento = fila.costoReacondicionamientoCentavos;
    if (fila.loteId !== null) {
      const lote = await db.lote.findUnique({
        where: { id: fila.loteId },
        select: { costoCentavos: true, transporteCentavos: true },
      });
      if (!lote) return null;
      const piezasDelLote = await db.pieza.count({ where: { loteId: fila.loteId } });
      if (piezasDelLote === 0) return reacondicionamiento;
      return (
        Math.round((lote.costoCentavos + lote.transporteCentavos) / piezasDelLote) +
        reacondicionamiento
      );
    }
    if (fila.proveedorId !== null && fila.costoDirectoCentavos !== null) {
      return fila.costoDirectoCentavos + reacondicionamiento;
    }
    return null;
  }

  async function aPiezaDelPanel(fila: FilaDePieza): Promise<PiezaDelPanel> {
    return {
      codigo: codigoDe(fila.codigo),
      estado: nombreDeEstado[fila.estado],
      nombre: fila.nombre,
      tipoId: fila.tipoId,
      colorId: fila.colorId,
      materialId: fila.materialId,
      altoCm: fila.altoCm,
      anchoCm: fila.anchoCm,
      profundidadCm: fila.profundidadCm,
      caidaCm: fila.caidaCm,
      precioCentavos: fila.precioCentavos,
      tamano: fila.anchoCm
        ? tamanoPorAncho(fila.anchoCm, config.umbralesDeTamano)
        : null,
      publicadaEn: fila.publicadaEn,
      rutaPublica: rutaPublica(fila.nombre, fila.sufijo),
      faltanParaPublicar: faltantes(fila),
      tomasFaltantes: tomasFaltantesDe(fila.fotos.map((foto) => foto.tipo)),
      loteId: fila.loteId,
      proveedorId: fila.proveedorId,
      costoDirectoCentavos: fila.costoDirectoCentavos,
      costoReacondicionamientoCentavos: fila.costoReacondicionamientoCentavos,
      condicionIngreso: fila.condicionIngreso ? condicionDePrisma(fila.condicionIngreso) : null,
      costoDePiezaCentavos: await costoDePiezaCentavos(fila),
    };
  }

  async function buscarFila(codigo: string): Promise<FilaDePieza | null> {
    const numero = numeroDeCodigo(codigo);
    if (numero === null) return null;
    return db.pieza.findUnique({ where: { codigo: numero }, include: { fotos: true } });
  }

  async function exigirFila(codigo: string): Promise<FilaDePieza> {
    const fila = await buscarFila(codigo);
    if (!fila) {
      throw new ErrorDeDominio(
        "pieza_no_encontrada",
        `No existe la pieza ${codigo}.`,
      );
    }
    return fila;
  }

  return {
    /**
     * Crea una pieza En preparación. Recibe su código de la secuencia (nunca
     * se reutiliza), un ID UUID v7 y un sufijo aleatorio para su URL. Los
     * datos pueden quedar incompletos hasta publicarla.
     */
    async crearPieza(datos: DatosDePieza = {}): Promise<PiezaDelPanel> {
      const limpios = await validar(db, datos);
      for (let intento = 1; ; intento++) {
        try {
          const fila = await db.pieza.create({
            data: {
              ...aDatosPrisma(limpios),
              id: uuidV7(config.ahora().getTime()),
              sufijo: sufijoAleatorio(),
            },
            include: { fotos: true },
          });
          return await aPiezaDelPanel(fila);
        } catch (error) {
          // Un sufijo repetido es muy improbable; si pasa, se sortea otro.
          const repetido =
            (error as { code?: string }).code === "P2002" && intento < 5;
          if (!repetido) throw error;
        }
      }
    },

    /**
     * Edita una pieza en cualquier estado. Una pieza ya publicada no puede
     * quedarse sin sus datos obligatorios. La URL pública conserva su sufijo:
     * la dirección anterior sigue llevando a la pieza.
     */
    async editarPieza(
      codigo: string,
      datos: DatosDePieza,
    ): Promise<PiezaDelPanel> {
      const fila = await exigirFila(codigo);
      const limpios = await validar(db, datos);

      if (fila.estado !== "EN_PREPARACION") {
        const faltan = faltantes({ ...fila, ...limpios });
        if (faltan.length > 0) {
          throw new ErrorDeDominio(
            "datos_invalidos",
            "Una pieza publicada no puede quedar sin sus datos obligatorios.",
            erroresDeFaltantes(faltan, ": la pieza ya está publicada"),
          );
        }
      }

      const editada = await db.pieza.update({
        where: { id: fila.id },
        data: aDatosPrisma(limpios),
        include: { fotos: true },
      });
      return await aPiezaDelPanel(editada);
    },

    /**
     * Publica una pieza: pasa de En preparación a Disponible y registra la
     * fecha de publicación. Exige los datos obligatorios y las 8 tomas
     * mínimas.
     */
    async publicarPieza(codigo: string): Promise<PiezaDelPanel> {
      const fila = await exigirFila(codigo);
      if (fila.estado !== "EN_PREPARACION") {
        throw new ErrorDeDominio(
          "transicion_no_permitida",
          `La pieza ${codigoDe(fila.codigo)} ya está publicada.`,
        );
      }
      const faltan = faltantes(fila);
      const faltanTomas = tomasFaltantesDe(fila.fotos.map((foto) => foto.tipo));
      if (faltan.length > 0 || faltanTomas.length > 0) {
        throw new ErrorDeDominio(
          "pieza_incompleta",
          "Faltan datos para publicar.",
          {
            ...erroresDeFaltantes(faltan, " para publicar"),
            ...(faltanTomas.length > 0
              ? { fotos: mensajeDeTomasFaltantes(faltanTomas) }
              : {}),
          },
        );
      }

      // El filtro por estado evita publicar dos veces si dos operadoras
      // pulsan a la vez.
      const { count } = await db.pieza.updateMany({
        where: { id: fila.id, estado: "EN_PREPARACION" },
        data: { estado: "DISPONIBLE", publicadaEn: config.ahora() },
      });
      if (count === 0) {
        throw new ErrorDeDominio(
          "transicion_no_permitida",
          `La pieza ${codigoDe(fila.codigo)} ya está publicada.`,
        );
      }
      return await aPiezaDelPanel(await exigirFila(codigo));
    },

    /** Una pieza por su código (`VT-0142`, `vt-142` o `142`), o `null`. */
    async piezaDelPanel(codigo: string): Promise<PiezaDelPanel | null> {
      const fila = await buscarFila(codigo);
      return fila ? await aPiezaDelPanel(fila) : null;
    },

    /** Todas las piezas, las últimas cargadas primero. */
    async listarPiezasDelPanel(): Promise<PiezaEnPanel[]> {
      const filas = await db.pieza.findMany({
        orderBy: { codigo: "desc" },
        select: { codigo: true, nombre: true, estado: true, precioCentavos: true },
      });
      return filas.map((fila) => ({
        codigo: codigoDe(fila.codigo),
        nombre: fila.nombre,
        estado: nombreDeEstado[fila.estado],
        precioCentavos: fila.precioCentavos,
      }));
    },

    /** Las piezas de un lote (las que creó su apertura), en el orden en que se cargaron. */
    async listarPiezasDeLote(loteId: number): Promise<PiezaEnPanel[]> {
      const filas = await db.pieza.findMany({
        where: { loteId },
        orderBy: { codigo: "asc" },
        select: { codigo: true, nombre: true, estado: true, precioCentavos: true },
      });
      return filas.map((fila) => ({
        codigo: codigoDe(fila.codigo),
        nombre: fila.nombre,
        estado: nombreDeEstado[fila.estado],
        precioCentavos: fila.precioCentavos,
      }));
    },

    /**
     * La ficha pública de una pieza a partir de su dirección
     * (`<slug>-<sufijo>`). Es la única función que produce lo que ve la
     * compradora. Devuelve `null` si el sufijo no existe o si la pieza está En
     * preparación: para la compradora, esa pieza no existe.
     */
    async fichaPublica(direccion: string): Promise<FichaPublica | null> {
      const sufijo = sufijoDeDireccion(direccion);
      if (!sufijo) return null;

      const fila = await db.pieza.findUnique({
        where: { sufijo },
        include: {
          tipo: true,
          color: true,
          material: true,
          fotos: true,
          reservas: {
            where: { estado: "ACTIVA" },
            select: { venceEn: true },
            take: 1,
          },
        },
      });
      if (!fila || fila.estado === "EN_PREPARACION") return null;

      const { nombre, tipo, color, material, altoCm, anchoCm, profundidadCm } =
        fila;
      if (
        !nombre || !tipo || !color || !material || !altoCm || !anchoCm ||
        !profundidadCm || !fila.precioCentavos || !fila.publicadaEn
      ) {
        throw new Error(
          `La pieza ${codigoDe(fila.codigo)} está publicada sin sus datos obligatorios.`,
        );
      }

      const umbrales = config.umbralesDeTamano;
      const tamano = tamanoPorAncho(anchoCm, umbrales);
      return {
        codigo: codigoDe(fila.codigo),
        nombre,
        ruta: rutaPublica(nombre, fila.sufijo),
        estado: nombreDeEstado[fila.estado] as FichaPublica["estado"],
        tipo: tipo.nombre,
        color: color.nombre,
        material: material.nombre,
        medidas: { altoCm, anchoCm, profundidadCm, caidaCm: fila.caidaCm },
        tamano: { nombre: tamano, rango: rangoDeTamano(tamano, umbrales) },
        tamanos: TAMANOS.map((t) => ({
          nombre: t,
          rango: rangoDeTamano(t, umbrales),
        })),
        precioCentavos: fila.precioCentavos,
        publicadaEn: fila.publicadaEn,
        reservadaHasta:
          fila.estado === "RESERVADA" ? (fila.reservas[0]?.venceEn ?? null) : null,
        fotos: fotosPublicasDesde(fila.fotos),
      };
    },
  };
}
