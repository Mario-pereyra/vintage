import type {
  EstadoPieza,
  PrismaClient,
  TipoDeToma as TipoDeTomaColumna,
} from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";
import { tomasFaltantes } from "./fotos";
import { formatearCodigo, numeroDeCodigo } from "./identificadores";
import { CAMPOS_OBLIGATORIOS, type crearPiezas, type PiezaDelPanel } from "./piezas";

/**
 * Drops (ticket #12, ver "Drop" en CONTEXT.md): un lanzamiento numerado que
 * agrupa piezas En preparación para publicarlas juntas o de a poco. El número
 * que se muestra ("DROP #03") es el `id` del drop.
 */

export interface ConfiguracionDeDrops {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
}

/** "DROP #03": el número visible de un drop, con al menos 2 cifras. */
export function numeroDeDrop(id: number): string {
  return `DROP #${String(id).padStart(2, "0")}`;
}

/** Estado de pieza, tal como se nombra fuera del dominio (ver piezas.ts). */
const NOMBRE_DE_ESTADO = {
  EN_PREPARACION: "en_preparacion",
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
  VENDIDA: "vendida",
  RETIRADA: "retirada",
} as const satisfies Record<EstadoPieza, string>;

/** Un drop tal como lo ve la operadora en el panel. */
export interface DropDelPanel {
  id: number;
  /** "DROP #03". */
  numero: string;
  creadoEn: Date;
  /** Cuántas piezas tiene asignadas, en cualquier estado. */
  piezasTotal: number;
  /**
   * En preparación, con todos los datos obligatorios y las 8 tomas: listas
   * para publicar. Sirve para el teaser genérico ("20 carteras nuevas").
   */
  piezasListas: number;
  /** Ya publicadas (o vendidas/retiradas) desde este drop. */
  piezasPublicadas: number;
}

/** Una pieza del drop, para elegir cuáles publicar. */
export interface PiezaDeDrop {
  codigo: string;
  nombre: string | null;
  estado: (typeof NOMBRE_DE_ESTADO)[EstadoPieza];
  /** Solo relevante En preparación: si tiene todo para publicarse. */
  lista: boolean;
}

/** La fila cruda que necesita `estaLista`, sin el costo de pieza ni sus relaciones. */
interface FilaParaDrop {
  codigo: number;
  nombre: string | null;
  estado: EstadoPieza;
  tipoId: number | null;
  colorId: number | null;
  materialId: number | null;
  altoCm: number | null;
  anchoCm: number | null;
  profundidadCm: number | null;
  precioCentavos: number | null;
  fotos: { tipo: TipoDeTomaColumna }[];
}

/**
 * Si la pieza tiene todos los datos obligatorios y las 8 tomas mínimas. Es una
 * versión liviana de `faltanParaPublicar`/`tomasFaltantes` de `piezaDelPanel`,
 * pensada para revisar muchas piezas de un drop en una sola consulta, sin
 * calcular el costo de cada una (que no hace falta para decidir si se publica).
 */
function estaLista(fila: FilaParaDrop): boolean {
  if (fila.estado !== "EN_PREPARACION") return false;
  const completa = CAMPOS_OBLIGATORIOS.every((campo) => fila[campo as keyof FilaParaDrop] != null);
  if (!completa) return false;
  return tomasFaltantes(fila.fotos.map((foto) => foto.tipo)).length === 0;
}

const SELECCION_PARA_DROP = {
  codigo: true,
  nombre: true,
  estado: true,
  tipoId: true,
  colorId: true,
  materialId: true,
  altoCm: true,
  anchoCm: true,
  profundidadCm: true,
  precioCentavos: true,
  fotos: { select: { tipo: true } },
} as const;

export function crearDrops(
  db: PrismaClient,
  piezas: ReturnType<typeof crearPiezas>,
  config: ConfiguracionDeDrops,
) {
  const codigoDe = (numero: number) => formatearCodigo(numero, config.prefijoDeCodigo);

  async function exigirDrop(id: number) {
    const fila =
      Number.isSafeInteger(id) && id > 0 ? await db.drop.findUnique({ where: { id } }) : null;
    if (!fila) {
      throw new ErrorDeDominio("drop_no_encontrado", `No existe el drop ${id}.`);
    }
    return fila;
  }

  async function filasDelDrop(id: number): Promise<FilaParaDrop[]> {
    return db.pieza.findMany({ where: { dropId: id }, select: SELECCION_PARA_DROP });
  }

  async function resumenDe(id: number, creadoEn: Date): Promise<DropDelPanel> {
    const filas = await filasDelDrop(id);
    return {
      id,
      numero: numeroDeDrop(id),
      creadoEn,
      piezasTotal: filas.length,
      piezasListas: filas.filter(estaLista).length,
      piezasPublicadas: filas.filter((fila) => fila.estado !== "EN_PREPARACION").length,
    };
  }

  return {
    /** Crea un drop vacío; se le asignan piezas después. */
    async crearDrop(): Promise<DropDelPanel> {
      const fila = await db.drop.create({ data: {} });
      return resumenDe(fila.id, fila.creadoEn);
    },

    /** Todos los drops, los últimos creados primero. */
    async listarDrops(): Promise<DropDelPanel[]> {
      const filas = await db.drop.findMany({ orderBy: { id: "desc" } });
      return Promise.all(filas.map((fila) => resumenDe(fila.id, fila.creadoEn)));
    },

    /** Un drop por su id, o `null` si no existe. */
    async dropDelPanel(id: number): Promise<DropDelPanel | null> {
      if (!Number.isSafeInteger(id) || id <= 0) return null;
      const fila = await db.drop.findUnique({ where: { id } });
      return fila ? resumenDe(fila.id, fila.creadoEn) : null;
    },

    /** Las piezas asignadas a un drop, en orden de carga. */
    async piezasDeDrop(id: number): Promise<PiezaDeDrop[]> {
      await exigirDrop(id);
      const filas = await filasDelDrop(id);
      return filas
        .sort((a, b) => a.codigo - b.codigo)
        .map((fila) => ({
          codigo: codigoDe(fila.codigo),
          nombre: fila.nombre,
          estado: NOMBRE_DE_ESTADO[fila.estado],
          lista: estaLista(fila),
        }));
    },

    /**
     * Piezas En preparación que todavía no están en ningún drop, las últimas
     * cargadas primero: de aquí se eligen las que se van a asignar.
     */
    async piezasSinDropEnPreparacion(): Promise<{ codigo: string; nombre: string | null }[]> {
      const filas = await db.pieza.findMany({
        where: { estado: "EN_PREPARACION", dropId: null },
        orderBy: { codigo: "desc" },
        select: { codigo: true, nombre: true },
      });
      return filas.map((fila) => ({ codigo: codigoDe(fila.codigo), nombre: fila.nombre }));
    },

    /**
     * Asigna piezas En preparación a un drop. Cada código debe existir y estar
     * En preparación (una pieza ya publicada no se agrega a un drop): si
     * alguna no cumple, no asigna ninguna y dice cuál.
     */
    async asignarPiezasADrop(id: number, codigos: string[]): Promise<DropDelPanel> {
      const drop = await exigirDrop(id);
      if (!Array.isArray(codigos) || codigos.length === 0) {
        throw new ErrorDeDominio("datos_invalidos", "Elige al menos una pieza.", {
          piezas: "Elige al menos una pieza En preparación.",
        });
      }

      const numeros = codigos.map(numeroDeCodigo);
      if (numeros.some((numero) => numero === null)) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa las piezas elegidas.", {
          piezas: "Alguna Ref. no es válida.",
        });
      }
      const numerosValidos = numeros as number[];

      const filas = await db.pieza.findMany({
        where: { codigo: { in: numerosValidos } },
        select: { codigo: true, estado: true },
      });
      const porNumero = new Map(filas.map((fila) => [fila.codigo, fila]));
      const invalidas = numerosValidos.filter((numero) => {
        const fila = porNumero.get(numero);
        return !fila || fila.estado !== "EN_PREPARACION";
      });
      if (invalidas.length > 0) {
        throw new ErrorDeDominio(
          "datos_invalidos",
          "Solo se asignan piezas En preparación.",
          { piezas: `No se puede asignar: ${invalidas.map(codigoDe).join(", ")}.` },
        );
      }

      await db.pieza.updateMany({
        where: { codigo: { in: numerosValidos } },
        data: { dropId: drop.id },
      });
      return resumenDe(drop.id, drop.creadoEn);
    },

    /**
     * Publica las piezas listas de un drop: todas, o solo las de `codigos` (que
     * deben estar listas y pertenecer al drop). Publicar de a poco es normal:
     * las demás quedan En preparación para un envío posterior. Reusa
     * `publicarPieza`, que ya exige los datos obligatorios y las 8 tomas.
     */
    async publicarDrop(id: number, codigos?: string[]): Promise<PiezaDelPanel[]> {
      await exigirDrop(id);
      const filas = await filasDelDrop(id);
      const listas = filas.filter(estaLista);
      const listasPorNumero = new Map(listas.map((fila) => [fila.codigo, fila]));

      let objetivo: FilaParaDrop[];
      if (codigos && codigos.length > 0) {
        const numeros = codigos.map(numeroDeCodigo);
        const noListas = codigos.filter((codigo, indice) => {
          const numero = numeros[indice];
          return numero === null || !listasPorNumero.has(numero);
        });
        if (noListas.length > 0) {
          throw new ErrorDeDominio(
            "pieza_incompleta",
            "Alguna pieza elegida no está lista para publicar (o no es de este drop).",
            { piezas: `No está lista: ${noListas.join(", ")}.` },
          );
        }
        objetivo = (numeros as number[]).map((numero) => listasPorNumero.get(numero)!);
      } else {
        if (listas.length === 0) {
          throw new ErrorDeDominio(
            "pieza_incompleta",
            "Ninguna pieza del drop está lista para publicar.",
          );
        }
        objetivo = listas;
      }

      const publicadas: PiezaDelPanel[] = [];
      for (const fila of objetivo) {
        publicadas.push(await piezas.publicarPieza(codigoDe(fila.codigo)));
      }
      return publicadas;
    },
  };
}

export type Drops = ReturnType<typeof crearDrops>;
