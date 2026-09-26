import type { EstadoPieza, PrismaClient } from "~/generated/prisma/client";

/**
 * Estados que la compradora ve en el listado principal y cómo se nombran
 * fuera del dominio. Las Vendidas van aparte ("Ver vendidas"); En preparación
 * y Retirada nunca se listan.
 */
const estadosDelListado = {
  DISPONIBLE: "disponible",
  RESERVADA: "reservada",
} as const satisfies Partial<Record<EstadoPieza, string>>;

type EstadoDelListado = keyof typeof estadosDelListado;

/**
 * Lo que la compradora ve de una pieza en el listado principal. Por ahora solo
 * su estado; la ficha pública (ticket #4 en adelante) define el resto y nunca
 * expone lo interno (lote, proveedor, costo, condición de ingreso).
 */
export interface PiezaEnCatalogo {
  estado: (typeof estadosDelListado)[EstadoDelListado];
}

/** El listado principal muestra Disponibles y Reservadas, más recientes primero. */
export async function listarCatalogo(
  db: PrismaClient,
): Promise<PiezaEnCatalogo[]> {
  const piezas = await db.pieza.findMany({
    where: {
      estado: { in: Object.keys(estadosDelListado) as EstadoDelListado[] },
    },
    orderBy: { publicadaEn: "desc" },
    select: { estado: true },
  });

  return piezas.map((pieza) => ({
    estado: estadosDelListado[pieza.estado as EstadoDelListado],
  }));
}
