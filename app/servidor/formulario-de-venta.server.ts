import type {
  CanalDeLaVenta,
  CompradoraDeReserva,
  DatosDeRetiro,
  DatosDeVenta,
  ModalidadDeLaEntrega,
  MotivoDelRetiro,
} from "~/dominio";

/**
 * Lectura de los formularios de venta, entrega y retiro del panel. Solo
 * convierte el texto en datos; las reglas (y los topes de cada monto) las
 * aplica el dominio.
 */

function texto(formulario: FormData, campo: string): string {
  return String(formulario.get(campo) ?? "").trim();
}

/**
 * Bolivianos escritos por la operadora ("150" o "150,50") → centavos enteros.
 * Vacío → null; cualquier otra cosa → NaN, que el dominio rechaza. Solo se
 * aceptan hasta 9 cifras enteras: lo que pase de ahí también es NaN, así un
 * número gigante nunca llega a redondearse a algo "válido".
 */
export function leerBolivianos(valor: FormDataEntryValue | null): number | null {
  const limpio = String(valor ?? "").trim().replace(",", ".");
  if (!limpio) return null;
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(limpio)) return Number.NaN;
  return Math.round(Number(limpio) * 100);
}

/** Zona horaria de la tienda (Bolivia, UTC−4 todo el año). */
const DESFASE_DE_BOLIVIA = "-04:00";

/** "2026-09-26" de hoy en Bolivia. */
export function hoyEnBolivia(ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - 4 * 60 * 60_000).toISOString().slice(0, 10);
}

/**
 * La fecha del formulario (`AAAA-MM-DD`, un día de Bolivia) → el instante de
 * la venta. Hoy (o vacío) → null: el dominio usa la hora actual. Un día
 * pasado → el último instante de ese día, así no queda antes de una
 * publicación hecha ese mismo día. Otra cosa → fecha inválida (el dominio la
 * rechaza).
 */
export function leerFecha(valor: FormDataEntryValue | null, ahora: Date = new Date()): Date | null {
  const limpio = String(valor ?? "").trim();
  if (!limpio || limpio === hoyEnBolivia(ahora)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpio)) return new Date(Number.NaN);
  return new Date(`${limpio}T23:59:59.999${DESFASE_DE_BOLIVIA}`);
}

/** Los datos de la venta y su entrega. */
export function leerVenta(codigo: string, formulario: FormData): DatosDeVenta {
  const compradoraId = texto(formulario, "compradoraId");
  const nombre = texto(formulario, "nombre");
  const whatsapp = texto(formulario, "whatsapp");
  const compradora: CompradoraDeReserva | null = compradoraId
    ? { id: compradoraId }
    : nombre || whatsapp
      ? { nombre, whatsapp }
      : null;

  return {
    codigo,
    pagoVerificado: formulario.get("pagoVerificado") === "si",
    precioFinalCentavos: leerBolivianos(formulario.get("precioFinal")) ?? Number.NaN,
    fecha: leerFecha(formulario.get("fecha")),
    compradora,
    canal: texto(formulario, "canal") as CanalDeLaVenta,
    entrega: {
      modalidad: texto(formulario, "modalidad") as ModalidadDeLaEntrega,
      costoCentavos: leerBolivianos(formulario.get("costoEntrega")),
      guia: texto(formulario, "guia") || null,
      entregada: formulario.get("entregada") === "si",
    },
  };
}

export function leerRetiro(formulario: FormData): DatosDeRetiro {
  return {
    motivo: texto(formulario, "motivo") as MotivoDelRetiro,
    nota: texto(formulario, "nota") || null,
  };
}
