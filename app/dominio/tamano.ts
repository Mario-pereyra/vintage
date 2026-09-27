/** Tamaño de una cartera, derivado de su ancho en cm. */
export type Tamano = "Mini" | "Pequeña" | "Mediana" | "Grande";

/** Los cuatro tamaños, en orden creciente de ancho. */
export const TAMANOS: readonly Tamano[] = ["Mini", "Pequeña", "Mediana", "Grande"];

/**
 * Anchos (en cm, inclusive) desde los que empieza cada tamaño. Mini es todo lo
 * que queda por debajo de `pequenaDesde`. Los ajusta la operadora en la
 * configuración de la tienda; ningún componente los tiene fijos.
 */
export interface UmbralesDeTamano {
  pequenaDesde: number;
  medianaDesde: number;
  grandeDesde: number;
}

/** El tamaño que corresponde a un ancho según los umbrales vigentes. */
export function tamanoPorAncho(
  ancho: number,
  umbrales: UmbralesDeTamano,
): Tamano {
  if (ancho < umbrales.pequenaDesde) return "Mini";
  if (ancho < umbrales.medianaDesde) return "Pequeña";
  if (ancho < umbrales.grandeDesde) return "Mediana";
  return "Grande";
}

/** El rango publicado de un tamaño, en palabras: "de 25 a 32 cm de ancho". */
export function rangoDeTamano(
  tamano: Tamano,
  umbrales: UmbralesDeTamano,
): string {
  switch (tamano) {
    case "Mini":
      return `menos de ${umbrales.pequenaDesde} cm de ancho`;
    case "Pequeña":
      return `de ${umbrales.pequenaDesde} a ${umbrales.medianaDesde - 1} cm de ancho`;
    case "Mediana":
      return `de ${umbrales.medianaDesde} a ${umbrales.grandeDesde - 1} cm de ancho`;
    case "Grande":
      return `más de ${umbrales.grandeDesde - 1} cm de ancho`;
  }
}

/**
 * El rango de ancho (en cm) de un tamaño, inverso de `tamanoPorAncho`: lo usa
 * el filtro por tamaño del catálogo. `desde` es inclusive; `hasta`, exclusivo
 * (`null` en Grande, que no tiene techo).
 */
export function anchoDeTamano(
  tamano: Tamano,
  umbrales: UmbralesDeTamano,
): { desde: number; hasta: number | null } {
  switch (tamano) {
    case "Mini":
      return { desde: 0, hasta: umbrales.pequenaDesde };
    case "Pequeña":
      return { desde: umbrales.pequenaDesde, hasta: umbrales.medianaDesde };
    case "Mediana":
      return { desde: umbrales.medianaDesde, hasta: umbrales.grandeDesde };
    case "Grande":
      return { desde: umbrales.grandeDesde, hasta: null };
  }
}
