import type { EstadoPieza, PrismaClient } from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";
import { formatearCodigo, numeroDeCodigo, uuidV7 } from "./identificadores";
import { PRECIO_MAXIMO_CENTAVOS } from "./piezas";

/** Nombre del estado, tal como se lee fuera del dominio, para el mensaje de rechazo. */
const NOMBRE_DE_ESTADO: Record<EstadoPieza, string> = {
  EN_PREPARACION: "en preparación",
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
  VENDIDA: "vendida",
  RETIRADA: "retirada",
};

/**
 * Historial del precio publicado (ticket #12, ver "Precio publicado" en
 * CONTEXT.md): el precio de una pieza puede cambiar con el tiempo (rebajas) y
 * se conserva su historial. Vive aparte de `piezas.ts` porque solo se aplica
 * a una pieza ya publicada; una pieza En preparación puede cambiar de precio
 * libremente (con `editarPieza`) sin dejar rastro, porque todavía no es un
 * "precio publicado".
 */

export interface ConfiguracionDeHistorialDePrecio {
  /** Prefijo del código de pieza: `"VT-"`. */
  prefijoDeCodigo: string;
  /** La hora actual. Las pruebas la fijan. */
  ahora: () => Date;
}

/** Un precio que tuvo la pieza y desde cuándo, el más reciente primero. */
export interface PrecioDelHistorial {
  /** Id de la fila del historial: sirve de `key` estable en el panel. */
  id: string;
  precioCentavos: number;
  fecha: Date;
}

export function crearHistorialDePrecio(
  db: PrismaClient,
  config: ConfiguracionDeHistorialDePrecio,
) {
  async function exigirPieza(codigo: string) {
    const numero = numeroDeCodigo(codigo);
    const fila = numero === null ? null : await db.pieza.findUnique({ where: { codigo: numero } });
    if (!fila) {
      throw new ErrorDeDominio("pieza_no_encontrada", `No existe la pieza ${codigo}.`);
    }
    return fila;
  }

  async function historialOrdenado(piezaId: string): Promise<PrecioDelHistorial[]> {
    const filas = await db.historialPrecio.findMany({
      where: { piezaId },
      orderBy: { fecha: "desc" },
    });
    return filas.map((fila) => ({
      id: fila.id,
      precioCentavos: fila.precioCentavos,
      fecha: fila.fecha,
    }));
  }

  return {
    /**
     * Cambia el precio publicado de una pieza y guarda el historial. La
     * primera vez que el precio de una pieza cambia, siembra también el
     * precio con el que se publicó (fechado el día de la publicación), para
     * que el historial quede completo desde el principio. Solo se puede
     * cambiar el precio de una pieza Disponible o Reservada: una vez Vendida
     * o Retirada, el precio publicado queda fijo. El cambio es atómico: el
     * `updateMany` exige el estado permitido y su `count` se verifica dentro
     * de la misma transacción, así que una venta concurrente (que mueve la
     * pieza a Vendida) gana la carrera sin dejar un precio ni un historial
     * inconsistentes.
     */
    async cambiarPrecioPublicado(
      codigo: string,
      nuevoPrecioCentavos: number,
    ): Promise<PrecioDelHistorial[]> {
      const fila = await exigirPieza(codigo);
      if (fila.publicadaEn === null || fila.precioCentavos === null) {
        throw new ErrorDeDominio(
          "transicion_no_permitida",
          `La pieza ${formatearCodigo(fila.codigo, config.prefijoDeCodigo)} todavía no está publicada.`,
        );
      }
      const rechazoPorEstado = () =>
        new ErrorDeDominio(
          "transicion_no_permitida",
          `El precio de ${formatearCodigo(fila.codigo, config.prefijoDeCodigo)} ya no se puede cambiar: está ${NOMBRE_DE_ESTADO[fila.estado]}.`,
        );
      if (fila.estado !== "DISPONIBLE" && fila.estado !== "RESERVADA") {
        throw rechazoPorEstado();
      }
      if (
        !(
          Number.isSafeInteger(nuevoPrecioCentavos) &&
          nuevoPrecioCentavos > 0 &&
          nuevoPrecioCentavos <= PRECIO_MAXIMO_CENTAVOS
        )
      ) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa el precio.", {
          precioCentavos: `Escribe un precio mayor que 0 y de hasta Bs ${(
            PRECIO_MAXIMO_CENTAVOS / 100
          ).toLocaleString("es-BO")}.`,
        });
      }

      if (nuevoPrecioCentavos === fila.precioCentavos) {
        // Sin cambio real: no duplica el historial.
        return historialOrdenado(fila.id);
      }

      const ahora = config.ahora();
      const precioAnterior = fila.precioCentavos;
      const publicadaEn = fila.publicadaEn;
      await db.$transaction(async (tx) => {
        // El filtro por estado evita cambiar el precio si la pieza se vendió
        // (o se retiró) justo entre la lectura de arriba y esta transacción.
        const { count } = await tx.pieza.updateMany({
          where: { id: fila.id, estado: { in: ["DISPONIBLE", "RESERVADA"] } },
          data: { precioCentavos: nuevoPrecioCentavos },
        });
        if (count === 0) throw rechazoPorEstado();

        const yaTieneHistorial = (await tx.historialPrecio.count({ where: { piezaId: fila.id } })) > 0;
        if (!yaTieneHistorial) {
          await tx.historialPrecio.create({
            data: {
              id: uuidV7(publicadaEn.getTime()),
              piezaId: fila.id,
              precioCentavos: precioAnterior,
              fecha: publicadaEn,
            },
          });
        }
        await tx.historialPrecio.create({
          data: {
            id: uuidV7(ahora.getTime()),
            piezaId: fila.id,
            precioCentavos: nuevoPrecioCentavos,
            fecha: ahora,
          },
        });
      });

      return historialOrdenado(fila.id);
    },

    /**
     * El historial de precios de una pieza, el más reciente primero. Vacío
     * mientras el precio publicado nunca cambió.
     */
    async historialDePrecio(codigo: string): Promise<PrecioDelHistorial[]> {
      const fila = await exigirPieza(codigo);
      return historialOrdenado(fila.id);
    },
  };
}

export type HistorialDePrecio = ReturnType<typeof crearHistorialDePrecio>;
