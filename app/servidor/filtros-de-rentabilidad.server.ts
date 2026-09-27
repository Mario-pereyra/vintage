import type { FiltrosDeRentabilidad } from "~/dominio";

/**
 * Un día `AAAA-MM-DD` de la URL, a medianoche (como `leerFecha` guarda la
 * fecha de compra de un lote). Vacío es `null`; cualquier otra cosa, o un día
 * que no existe (31 de febrero), es una fecha inválida que el dominio rechaza.
 */
function leerDia(texto: string): Date | null {
  if (!texto) return null;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!partes) return new Date(Number.NaN);
  const fecha = new Date(`${texto}T00:00:00`);
  const [, anio, mes, dia] = partes.map(Number);
  const existe =
    fecha.getFullYear() === anio && fecha.getMonth() + 1 === mes && fecha.getDate() === dia;
  return existe ? fecha : new Date(Number.NaN);
}

/** Lee `?desde=` y `?hasta=` (días incluidos) de la URL de una pantalla de rentabilidad. */
export function leerFiltrosDeRentabilidad(url: URL): {
  filtros: FiltrosDeRentabilidad;
  desde: string;
  hasta: string;
} {
  // Un día ocupa 10 caracteres: lo más largo no se parsea ni se devuelve.
  const acotar = (valor: string | null) => {
    const texto = (valor ?? "").trim();
    return texto.length > 10 ? "x" : texto;
  };
  const desde = acotar(url.searchParams.get("desde"));
  const hasta = acotar(url.searchParams.get("hasta"));
  return { filtros: { desde: leerDia(desde), hasta: leerDia(hasta) }, desde, hasta };
}

/** El id de un lote o proveedor de la URL; `NaN` si no es un entero corto (el dominio devuelve `null`). */
export function leerId(texto: string | undefined): number {
  return texto && /^\d{1,10}$/.test(texto) ? Number(texto) : Number.NaN;
}
