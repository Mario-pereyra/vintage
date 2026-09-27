import type {
  CompradoraDeReserva,
  DatosDeInteresada,
  DatosDeReserva,
  OrigenDeLaReserva,
} from "~/dominio";

/**
 * Lectura de los formularios de reservas e interesadas del panel. Solo
 * convierte el texto en datos; las reglas las aplica el dominio.
 */

function texto(formulario: FormData, campo: string): string {
  return String(formulario.get(campo) ?? "").trim();
}

/** Minutos escritos por la operadora; vacío → null; otra cosa → NaN (el dominio la rechaza). */
export function leerMinutos(valor: FormDataEntryValue | null): number | null {
  const limpio = String(valor ?? "").trim();
  if (!limpio) return null;
  return /^\d+$/.test(limpio) ? Number(limpio) : Number.NaN;
}

/**
 * Los datos de una reserva nueva. La compradora es la elegida en la búsqueda
 * (`compradoraId`) o una nueva (`nombre` y `whatsapp`).
 */
export function leerReserva(codigo: string, formulario: FormData): DatosDeReserva {
  const compradoraId = texto(formulario, "compradoraId");
  const compradora: CompradoraDeReserva = compradoraId
    ? { id: compradoraId }
    : { nombre: texto(formulario, "nombre"), whatsapp: texto(formulario, "whatsapp") };
  return {
    codigo,
    compradora,
    origen: texto(formulario, "origen") as OrigenDeLaReserva,
    plazoMinutos: leerMinutos(formulario.get("plazoMinutos")),
    pagoPrevio: formulario.get("pagoPrevio") === "si",
  };
}

export function leerInteresada(formulario: FormData): DatosDeInteresada {
  return {
    nombre: texto(formulario, "nombre"),
    whatsapp: texto(formulario, "whatsapp"),
    nota: texto(formulario, "nota") || null,
  };
}
