/**
 * Los tres identificadores de una pieza (ADR 0006): el ID interno UUID v7, el
 * código correlativo con prefijo (`VT-0001`) y la dirección pública
 * `<slug>-<sufijo>`.
 */

/** UUID v7: 48 bits de milisegundos y el resto aleatorio (RFC 9562). */
export function uuidV7(ahora: number = Date.now()): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let ms = ahora;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // versión 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variante RFC
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Base32 de Crockford en minúsculas: sin i, l, o ni u, que se confunden. */
const ALFABETO_DEL_SUFIJO = "0123456789abcdefghjkmnpqrstvwxyz";
const LARGO_DEL_SUFIJO = 6;

/** Sufijo aleatorio de la URL pública: 32⁶ ≈ mil millones de combinaciones. */
export function sufijoAleatorio(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LARGO_DEL_SUFIJO));
  return Array.from(bytes, (b) => ALFABETO_DEL_SUFIJO[b % 32]).join("");
}

/** Palabras que no aportan a la URL: "bandolera-de-cuero" → "bandolera-cuero". */
const PALABRAS_VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "en"]);

/** El slug legible de un nombre: sin tildes, en minúsculas y con guiones. */
export function slugDeNombre(nombre: string | null): string {
  const palabras = (nombre ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((palabra) => palabra && !PALABRAS_VACIAS.has(palabra));

  let slug = "";
  for (const palabra of palabras) {
    const siguiente = slug ? `${slug}-${palabra}` : palabra;
    if (siguiente.length > 60) break;
    slug = siguiente;
  }
  return slug || "cartera";
}

/** La ruta pública de una pieza: `/carteras/<slug>-<sufijo>`. */
export function rutaPublica(nombre: string | null, sufijo: string): string {
  return `/carteras/${slugDeNombre(nombre)}-${sufijo}`;
}

/**
 * El sufijo de una dirección pública (`bandolera-cuero-negra-k7f3q9`). El
 * slug no importa: puede ser el de un nombre anterior.
 */
export function sufijoDeDireccion(direccion: string): string | null {
  const coincidencia = /(?:^|-)([0-9a-z]{6})$/.exec(direccion.trim().toLowerCase());
  return coincidencia ? coincidencia[1] : null;
}

/** El código para mostrar: prefijo más al menos 4 cifras (`VT-0001`). */
export function formatearCodigo(numero: number, prefijo: string): string {
  return `${prefijo}${String(numero).padStart(4, "0")}`;
}

/**
 * El número de un código tal como lo escribe la operadora: `VT-0142`,
 * `vt-142` o `142`. Ignora el prefijo, que puede cambiar con la marca.
 */
export function numeroDeCodigo(codigo: string): number | null {
  const coincidencia = /(\d+)\s*$/.exec(codigo);
  if (!coincidencia) return null;
  const numero = Number(coincidencia[1]);
  return Number.isSafeInteger(numero) && numero > 0 && numero <= 2_147_483_647
    ? numero
    : null;
}
