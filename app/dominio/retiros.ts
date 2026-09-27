import type { MotivoDeRetiro, PrismaClient } from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";
import { formatearCodigo, numeroDeCodigo, uuidV7 } from "./identificadores";

/** Lo que los retiros necesitan saber de la tienda y del reloj. */
export interface ConfiguracionDeRetiros {
  prefijoDeCodigo: string;
  /** La hora actual. Las pruebas la fijan. */
  ahora: () => Date;
}

/** Por qué una pieza sale del catálogo sin venderse. */
export type MotivoDelRetiro = "irrecuperable" | "devuelta_al_proveedor" | "uso_propio" | "otro";

const MOTIVO: Record<MotivoDelRetiro, MotivoDeRetiro> = {
  irrecuperable: "IRRECUPERABLE",
  devuelta_al_proveedor: "DEVUELTA_AL_PROVEEDOR",
  uso_propio: "USO_PROPIO",
  otro: "OTRO",
};

const nombreDeMotivo = Object.fromEntries(
  Object.entries(MOTIVO).map(([nombre, valor]) => [valor, nombre]),
) as Record<MotivoDeRetiro, MotivoDelRetiro>;

/** Largo máximo de la nota de un retiro. */
const NOTA_MAXIMA = 280;

export interface DatosDeRetiro {
  motivo: MotivoDelRetiro;
  /** Obligatoria con el motivo «otro». */
  nota?: string | null;
}

/** El retiro de una pieza, en el panel. Es interno: la ficha solo dice «ya no disponible». */
export interface RetiroDePieza {
  codigo: string;
  motivo: MotivoDelRetiro;
  nota: string | null;
  retiradaEn: Date;
}

export function crearRetiros(db: PrismaClient, config: ConfiguracionDeRetiros) {
  const codigoDe = (numero: number) => formatearCodigo(numero, config.prefijoDeCodigo);

  async function exigirPieza(codigo: string) {
    const numero = numeroDeCodigo(codigo);
    const pieza = numero === null ? null : await db.pieza.findUnique({ where: { codigo: numero } });
    if (!pieza) {
      throw new ErrorDeDominio("pieza_no_encontrada", `No existe la pieza ${codigo}.`);
    }
    return pieza;
  }

  return {
    /**
     * Retira una pieza En preparación o Disponible con un motivo: pasa a
     * Retirada, un estado final. Sale del catálogo; si llegó a publicarse, su
     * URL sigue respondiendo con «ya no disponible». Una pieza Reservada no
     * se retira: primero se cancela la reserva.
     */
    async retirarPieza(codigo: string, datos: DatosDeRetiro): Promise<RetiroDePieza> {
      const errores: Record<string, string> = {};
      const motivo = Object.hasOwn(MOTIVO, String(datos.motivo))
        ? MOTIVO[datos.motivo]
        : undefined;
      if (!motivo) errores.motivo = "Elige el motivo del retiro.";
      const nota = (datos.nota ?? "").trim().replace(/\s+/g, " ") || null;
      if (nota && nota.length > NOTA_MAXIMA) {
        errores.nota = `Usa como máximo ${NOTA_MAXIMA} caracteres.`;
      } else if (motivo === "OTRO" && !nota) {
        errores.nota = "Cuenta por qué se retira.";
      }
      if (Object.keys(errores).length > 0) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
      }

      const pieza = await exigirPieza(codigo);
      const ahora = config.ahora();
      const rechazo = () =>
        new ErrorDeDominio(
          "transicion_no_permitida",
          pieza.estado === "RESERVADA"
            ? `La pieza ${codigoDe(pieza.codigo)} está reservada: cancela la reserva antes de retirarla.`
            : `Solo se retira una pieza En preparación o Disponible; ${codigoDe(pieza.codigo)} ya está ${pieza.estado === "VENDIDA" ? "vendida" : pieza.estado === "RETIRADA" ? "retirada" : "reservada"}.`,
        );

      const retiro = await db.$transaction(async (tx) => {
        // El filtro por estado evita retirar una pieza que otra operadora
        // acaba de reservar o vender.
        const { count } = await tx.pieza.updateMany({
          where: { id: pieza.id, estado: { in: ["EN_PREPARACION", "DISPONIBLE"] } },
          data: { estado: "RETIRADA" },
        });
        if (count === 0) throw rechazo();
        return tx.retiro.create({
          data: { id: uuidV7(ahora.getTime()), piezaId: pieza.id, motivo: motivo!, nota, retiradaEn: ahora },
        });
      });

      return {
        codigo: codigoDe(pieza.codigo),
        motivo: nombreDeMotivo[retiro.motivo],
        nota: retiro.nota,
        retiradaEn: retiro.retiradaEn,
      };
    },

    /** El retiro de una pieza, o `null` si no está retirada. */
    async retiroDePieza(codigo: string): Promise<RetiroDePieza | null> {
      const pieza = await exigirPieza(codigo);
      const retiro = await db.retiro.findUnique({ where: { piezaId: pieza.id } });
      if (!retiro) return null;
      return {
        codigo: codigoDe(pieza.codigo),
        motivo: nombreDeMotivo[retiro.motivo],
        nota: retiro.nota,
        retiradaEn: retiro.retiradaEn,
      };
    },
  };
}
