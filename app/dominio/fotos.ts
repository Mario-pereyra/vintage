import type {
  Foto,
  PrismaClient,
  TipoDeToma as TipoDeTomaColumna,
} from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";
import { formatearCodigo, numeroDeCodigo, uuidV7 } from "./identificadores";

/**
 * Las 8 tomas estandarizadas de una pieza (PRODUCT.md): frente, dorso,
 * lateral, base y esquinas, interior, herrajes y cierre, asas y puesta en una
 * persona. Se muestran siempre en este orden, en el panel y en la ficha
 * pública; no es el orden en que se cargan.
 */
export type TipoDeToma =
  | "frente"
  | "dorso"
  | "lateral"
  | "base_y_esquinas"
  | "interior"
  | "herrajes_y_cierre"
  | "asas"
  | "puesta";

const NOMBRE_DE_TOMA = {
  FRENTE: "frente",
  DORSO: "dorso",
  LATERAL: "lateral",
  BASE_Y_ESQUINAS: "base_y_esquinas",
  INTERIOR: "interior",
  HERRAJES_Y_CIERRE: "herrajes_y_cierre",
  ASAS: "asas",
  PUESTA: "puesta",
} as const satisfies Record<TipoDeTomaColumna, TipoDeToma>;

const COLUMNA_DE_TOMA = Object.fromEntries(
  Object.entries(NOMBRE_DE_TOMA).map(([columna, nombre]) => [nombre, columna]),
) as Record<TipoDeToma, TipoDeTomaColumna>;

/** Cómo se nombra cada toma para la operadora y para el `alt` de la foto. */
const ETIQUETA_DE_TOMA: Record<TipoDeToma, string> = {
  frente: "Frente",
  dorso: "Dorso",
  lateral: "Lateral",
  base_y_esquinas: "Base y esquinas",
  interior: "Interior",
  herrajes_y_cierre: "Herrajes y cierre",
  asas: "Asas",
  puesta: "Puesta",
};

/** Las 8 tomas mínimas para publicar, en su orden fijo de presentación. */
export const TOMAS_REQUERIDAS: readonly TipoDeToma[] = [
  "frente",
  "dorso",
  "lateral",
  "base_y_esquinas",
  "interior",
  "herrajes_y_cierre",
  "asas",
  "puesta",
];

const INDICE_DE_TOMA = new Map(TOMAS_REQUERIDAS.map((tipo, indice) => [tipo, indice]));

/** Las claves R2 de las tres variantes que genera el navegador de una foto. */
export interface DatosDeFoto {
  claveMiniatura: string;
  claveCatalogo: string;
  claveDetalle: string;
}

/** Una foto tal como la ve la operadora en el panel. */
export interface FotoDelPanel extends DatosDeFoto {
  tipo: TipoDeToma;
  etiqueta: string;
  portada: boolean;
}

/**
 * Lo que ve la compradora de una foto en la ficha pública: nunca la
 * miniatura (es solo para el panel) ni ningún identificador interno.
 */
export interface FotoPublica {
  tipo: TipoDeToma;
  etiqueta: string;
  portada: boolean;
  claveCatalogo: string;
  claveDetalle: string;
}

const LARGO_MAXIMO_DE_CLAVE = 512;

function esTipoDeToma(valor: unknown): valor is TipoDeToma {
  return typeof valor === "string" && valor in COLUMNA_DE_TOMA;
}

/**
 * Valida que `valor` sea una de las 8 tomas antes de usarlo en cualquier
 * `where` de Prisma. Un `tipo` inválido nunca debe llegar a una consulta: con
 * `COLUMNA_DE_TOMA[tipo]` en `undefined`, Prisma lo trata como "sin filtro"
 * (por ejemplo, `deleteMany({ tipo: undefined })` borra todas las fotos de la
 * pieza en vez de ninguna).
 */
function exigirTipoDeToma(valor: unknown): TipoDeToma {
  if (!esTipoDeToma(valor)) {
    throw new ErrorDeDominio("datos_invalidos", "Esa toma no existe.", {
      tipo: "Elige una de las 8 tomas.",
    });
  }
  return valor;
}

function validarClaves(datos: DatosDeFoto): void {
  const errores: Record<string, string> = {};
  for (const campo of ["claveMiniatura", "claveCatalogo", "claveDetalle"] as const) {
    const clave = datos[campo];
    if (
      typeof clave !== "string" ||
      clave.trim().length === 0 ||
      clave.length > LARGO_MAXIMO_DE_CLAVE
    ) {
      errores[campo] = "Falta la foto subida a R2.";
    }
  }
  if (Object.keys(errores).length > 0) {
    throw new ErrorDeDominio("datos_invalidos", "La foto no se pudo registrar.", errores);
  }
}

/** Las tomas requeridas que no aparecen entre las columnas dadas. */
export function tomasFaltantes(tiposPresentes: readonly TipoDeTomaColumna[]): TipoDeToma[] {
  const presentes = new Set(tiposPresentes.map((tipo) => NOMBRE_DE_TOMA[tipo]));
  return TOMAS_REQUERIDAS.filter((tipo) => !presentes.has(tipo));
}

/** "Faltan las tomas: dorso, asas y puesta." (para el error de publicar). */
export function mensajeDeTomasFaltantes(faltan: readonly TipoDeToma[]): string {
  const lista = new Intl.ListFormat("es", { type: "conjunction" }).format(
    faltan.map((tipo) => ETIQUETA_DE_TOMA[tipo].toLowerCase()),
  );
  return faltan.length === 1 ? `Falta la toma: ${lista}.` : `Faltan las tomas: ${lista}.`;
}

function ordenarPorToma<T extends { tipo: TipoDeTomaColumna }>(filas: readonly T[]): T[] {
  return [...filas].sort(
    (a, b) => (INDICE_DE_TOMA.get(NOMBRE_DE_TOMA[a.tipo]) ?? 0) -
      (INDICE_DE_TOMA.get(NOMBRE_DE_TOMA[b.tipo]) ?? 0),
  );
}

/** Una fila de `Foto` tal como la devuelve Prisma, en el panel. */
export function aFotoDelPanel(fila: Foto): FotoDelPanel {
  const tipo = NOMBRE_DE_TOMA[fila.tipo];
  return {
    tipo,
    etiqueta: ETIQUETA_DE_TOMA[tipo],
    portada: fila.portada,
    claveMiniatura: fila.claveMiniatura,
    claveCatalogo: fila.claveCatalogo,
    claveDetalle: fila.claveDetalle,
  };
}

/** Las fotos de una pieza para el panel, en el orden fijo de las tomas. */
export function fotosDelPanelDesde(filas: readonly Foto[]): FotoDelPanel[] {
  return ordenarPorToma(filas).map(aFotoDelPanel);
}

/** Las fotos de una pieza para la ficha pública: sin miniatura ni id. */
export function fotosPublicasDesde(filas: readonly Foto[]): FotoPublica[] {
  return ordenarPorToma(filas).map((fila) => {
    const tipo = NOMBRE_DE_TOMA[fila.tipo];
    return {
      tipo,
      etiqueta: ETIQUETA_DE_TOMA[tipo],
      portada: fila.portada,
      claveCatalogo: fila.claveCatalogo,
      claveDetalle: fila.claveDetalle,
    };
  });
}

/** Configuración que necesita el módulo de fotos: el prefijo del código. */
export interface ConfiguracionDeFotos {
  prefijoDeCodigo: string;
}

export function crearFotos(db: PrismaClient, config: ConfiguracionDeFotos) {
  const codigoDe = (numero: number) => formatearCodigo(numero, config.prefijoDeCodigo);

  async function exigirPieza(codigo: string) {
    const numero = numeroDeCodigo(codigo);
    const fila = numero
      ? await db.pieza.findUnique({ where: { codigo: numero }, select: { id: true, estado: true, codigo: true } })
      : null;
    if (!fila) {
      throw new ErrorDeDominio("pieza_no_encontrada", `No existe la pieza ${codigo}.`);
    }
    return fila;
  }

  async function listar(piezaId: string): Promise<Foto[]> {
    return db.foto.findMany({ where: { piezaId } });
  }

  return {
    /**
     * Registra la foto de una toma. Si la pieza ya tenía una foto de esa
     * toma, la reemplaza (volver a fotografiarla no la duplica). La primera
     * foto que recibe una pieza queda como portada.
     */
    async agregarFoto(codigo: string, tipoDado: TipoDeToma, datos: DatosDeFoto): Promise<FotoDelPanel[]> {
      const tipo = exigirTipoDeToma(tipoDado);
      validarClaves(datos);
      const pieza = await exigirPieza(codigo);

      // Transacción: leer si es la primera foto y decidir la portada tiene
      // que ser atómico con el upsert, para que dos fotos subidas a la vez no
      // queden las dos como portada.
      await db.$transaction(async (tx) => {
        const existentes = await tx.foto.count({ where: { piezaId: pieza.id } });
        await tx.foto.upsert({
          where: { piezaId_tipo: { piezaId: pieza.id, tipo: COLUMNA_DE_TOMA[tipo] } },
          create: {
            id: uuidV7(),
            piezaId: pieza.id,
            tipo: COLUMNA_DE_TOMA[tipo],
            portada: existentes === 0,
            ...datos,
          },
          update: datos,
        });
      });
      return fotosDelPanelDesde(await listar(pieza.id));
    },

    /**
     * Borra la foto de una toma. Si era la portada, la portada pasa a la
     * primera toma (en el orden fijo) que quede. No se puede borrar una toma
     * de una pieza ya publicada: la dejaría sin las 8 mínimas.
     */
    async eliminarFoto(codigo: string, tipoDado: TipoDeToma): Promise<FotoDelPanel[]> {
      const tipo = exigirTipoDeToma(tipoDado);
      const pieza = await exigirPieza(codigo);
      if (pieza.estado !== "EN_PREPARACION") {
        throw new ErrorDeDominio(
          "datos_invalidos",
          "Una pieza publicada no puede quedar sin sus 8 tomas.",
          { fotos: `La pieza ${codigoDe(pieza.codigo)} ya está publicada.` },
        );
      }
      const borrada = await db.foto.deleteMany({
        where: { piezaId: pieza.id, tipo: COLUMNA_DE_TOMA[tipo] },
      });
      const restantes = fotosDelPanelDesde(await listar(pieza.id));
      if (borrada.count > 0 && restantes.length > 0 && !restantes.some((f) => f.portada)) {
        const nuevaPortada = restantes[0];
        await db.foto.update({
          where: { piezaId_tipo: { piezaId: pieza.id, tipo: COLUMNA_DE_TOMA[nuevaPortada.tipo] } },
          data: { portada: true },
        });
        nuevaPortada.portada = true;
      }
      return restantes;
    },

    /** Cambia cuál es la portada: la foto que muestra el catálogo. */
    async elegirPortada(codigo: string, tipoDado: TipoDeToma): Promise<FotoDelPanel[]> {
      const tipo = exigirTipoDeToma(tipoDado);
      const pieza = await exigirPieza(codigo);
      const actual = await db.foto.findUnique({
        where: { piezaId_tipo: { piezaId: pieza.id, tipo: COLUMNA_DE_TOMA[tipo] } },
      });
      if (!actual) {
        throw new ErrorDeDominio("datos_invalidos", "Esa toma todavía no tiene foto.", {
          tipo: "Subí la foto de esa toma antes de elegirla como portada.",
        });
      }
      await db.$transaction([
        db.foto.updateMany({ where: { piezaId: pieza.id }, data: { portada: false } }),
        db.foto.update({ where: { id: actual.id }, data: { portada: true } }),
      ]);
      return fotosDelPanelDesde(await listar(pieza.id));
    },

    /**
     * Intercambia las fotos (y la portada, si alguna la tiene) entre dos
     * tomas, sin tocar a qué toma pertenece cada hueco: sirve para corregir
     * una toma subida en el lugar equivocado.
     */
    async intercambiarFotos(codigo: string, tipoADado: TipoDeToma, tipoBDado: TipoDeToma): Promise<FotoDelPanel[]> {
      const tipoA = exigirTipoDeToma(tipoADado);
      const tipoB = exigirTipoDeToma(tipoBDado);
      const pieza = await exigirPieza(codigo);
      const [filaA, filaB] = await Promise.all([
        db.foto.findUnique({ where: { piezaId_tipo: { piezaId: pieza.id, tipo: COLUMNA_DE_TOMA[tipoA] } } }),
        db.foto.findUnique({ where: { piezaId_tipo: { piezaId: pieza.id, tipo: COLUMNA_DE_TOMA[tipoB] } } }),
      ]);
      if (!filaA || !filaB) {
        throw new ErrorDeDominio("datos_invalidos", "Las dos tomas necesitan tener foto para intercambiarlas.");
      }
      await db.$transaction([
        db.foto.update({
          where: { id: filaA.id },
          data: {
            claveMiniatura: filaB.claveMiniatura,
            claveCatalogo: filaB.claveCatalogo,
            claveDetalle: filaB.claveDetalle,
            portada: filaB.portada,
          },
        }),
        db.foto.update({
          where: { id: filaB.id },
          data: {
            claveMiniatura: filaA.claveMiniatura,
            claveCatalogo: filaA.claveCatalogo,
            claveDetalle: filaA.claveDetalle,
            portada: filaA.portada,
          },
        }),
      ]);
      return fotosDelPanelDesde(await listar(pieza.id));
    },

    /** Las fotos cargadas de una pieza, en el orden fijo de las tomas. */
    async fotosDePieza(codigo: string): Promise<FotoDelPanel[]> {
      const pieza = await exigirPieza(codigo);
      return fotosDelPanelDesde(await listar(pieza.id));
    },
  };
}

export type Fotos = ReturnType<typeof crearFotos>;
