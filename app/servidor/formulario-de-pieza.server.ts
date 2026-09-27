import { data } from "react-router";

import {
  ErrorDeDominio,
  type CampoDePieza,
  type DatosDePieza,
  type Dominio,
  type Lista,
} from "~/dominio";

/**
 * Lectura del formulario de pieza del panel (`routes/admin/piezas/`). Solo
 * convierte el texto del formulario en datos; las reglas las aplica el
 * dominio.
 */

/** "22,5" → 22.5; vacío → null; otra cosa → NaN (el dominio la rechaza). */
function leerNumero(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!texto) return null;
  return /^\d+(\.\d+)?$/.test(texto) ? Number(texto) : Number.NaN;
}

/** El id elegido en los chips de una lista, o null. */
function leerId(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim();
  return texto ? Number(texto) : null;
}

/** Bolivianos escritos por la operadora ("150" o "150,50") → centavos enteros. */
function leerPrecio(valor: FormDataEntryValue | null): number | null {
  const bolivianos = leerNumero(valor);
  if (bolivianos === null || Number.isNaN(bolivianos)) return bolivianos;
  return Math.round(bolivianos * 100);
}

const LISTA_DEL_CAMPO = {
  tipoId: "tipos",
  colorId: "colores",
  materialId: "materiales",
} as const satisfies Partial<Record<CampoDePieza, Lista>>;

/**
 * Lee los datos de la pieza del formulario. Si la operadora escribió un valor
 * nuevo en alguna lista ("+ Otro", campo `<campo>Nuevo`), primero lo suma a la
 * lista y usa su id.
 */
export async function leerFormularioDePieza(
  formulario: FormData,
  dominio: Dominio,
): Promise<{ intencion: "guardar" | "publicar"; datos: DatosDePieza }> {
  const datos: DatosDePieza = {
    nombre: String(formulario.get("nombre") ?? ""),
    tipoId: leerId(formulario.get("tipoId")),
    colorId: leerId(formulario.get("colorId")),
    materialId: leerId(formulario.get("materialId")),
    altoCm: leerNumero(formulario.get("altoCm")),
    anchoCm: leerNumero(formulario.get("anchoCm")),
    profundidadCm: leerNumero(formulario.get("profundidadCm")),
    caidaCm: leerNumero(formulario.get("caidaCm")),
    precioCentavos: leerPrecio(formulario.get("precio")),
  };

  // Solo lo toca si el formulario lo trae: nueva.tsx no lo muestra (una pieza
  // recién creada todavía no tiene procedencia).
  const reacondicionamiento = formulario.get("reacondicionamiento");
  if (reacondicionamiento !== null) {
    datos.costoReacondicionamientoCentavos = leerPrecio(reacondicionamiento) ?? 0;
  }

  for (const [campo, lista] of Object.entries(LISTA_DEL_CAMPO)) {
    const nuevo = String(formulario.get(`${campo}Nuevo`) ?? "").trim();
    if (!nuevo) continue;
    try {
      datos[campo as keyof typeof LISTA_DEL_CAMPO] = (
        await dominio.ampliarLista(lista, nuevo)
      ).id;
    } catch (error) {
      if (!(error instanceof ErrorDeDominio)) throw error;
      throw new ErrorDeDominio(error.motivo, error.message, {
        [campo]: error.errores.nombre ?? error.message,
      });
    }
  }

  return {
    intencion: formulario.get("intencion") === "publicar" ? "publicar" : "guardar",
    datos,
  };
}

/**
 * Convierte un rechazo del dominio en la respuesta de la action (400, con el
 * mensaje y los errores por campo). Cualquier otro error sigue su curso.
 */
export function respuestaDeRechazo(error: unknown) {
  if (!(error instanceof ErrorDeDominio)) throw error;
  return data(
    { mensaje: error.message, errores: { ...error.errores } },
    { status: 400 },
  );
}
