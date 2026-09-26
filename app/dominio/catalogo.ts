import type { PrismaClient } from "~/generated/prisma/client";

/**
 * Lo que la compradora ve de una pieza en el listado principal. Por ahora solo
 * su estado; la ficha pública (ticket #4 en adelante) define el resto y nunca
 * expone lo interno (lote, proveedor, costo, condición de ingreso).
 */
export interface PiezaEnCatalogo {
  estado: "disponible" | "reservada";
}

/** El listado principal muestra Disponibles y Reservadas, más recientes primero. */
export async function listarCatalogo(
  db: PrismaClient,
): Promise<PiezaEnCatalogo[]> {
  const piezas = await db.pieza.findMany({
    where: { estado: { in: ["DISPONIBLE", "RESERVADA"] } },
    orderBy: { publicadaEn: "desc" },
    select: { estado: true },
  });

  return piezas.map((pieza) => ({
    estado: pieza.estado === "RESERVADA" ? "reservada" : "disponible",
  }));
}
