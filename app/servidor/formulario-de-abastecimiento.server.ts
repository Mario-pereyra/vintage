import {
  ErrorDeDominio,
  type CanalDeAbastecimiento,
  type CondicionDePieza,
  type DatosDeApertura,
  type DatosDeCompraAParticular,
  type DatosDeLote,
  type DatosDeProveedor,
  type Dominio,
  type Lista,
} from "~/dominio";

/**
 * Lectura de los formularios del panel de abastecimiento (proveedores, lotes,
 * apertura y compra a particular). Solo convierte texto en datos; las reglas
 * las aplica el dominio. Comparte `respuestaDeRechazo` con el formulario de
 * pieza.
 */

function leerTexto(valor: FormDataEntryValue | null): string {
  return String(valor ?? "").trim();
}

/** "150" o "150,50" (bolivianos) → centavos enteros, o `NaN` si no es número. */
function leerCentavos(valor: FormDataEntryValue | null): number {
  const texto = leerTexto(valor).replace(",", ".");
  return /^\d+(\.\d+)?$/.test(texto) ? Math.round(Number(texto) * 100) : Number.NaN;
}

/** "2026-09-01" → Date a medianoche, o `Invalid Date` si está vacío. */
function leerFecha(valor: FormDataEntryValue | null): Date {
  return new Date(`${leerTexto(valor)}T00:00:00`);
}

export function leerFormularioDeProveedor(formulario: FormData): DatosDeProveedor {
  return {
    nombre: leerTexto(formulario.get("nombre")),
    contacto: leerTexto(formulario.get("contacto")),
  };
}

const LISTA_CALIDADES_DECLARADAS: Lista = "calidadesDeclaradas";

export async function leerFormularioDeLote(
  formulario: FormData,
  dominio: Dominio,
): Promise<DatosDeLote> {
  let calidadDeclaradaId = Number(leerTexto(formulario.get("calidadDeclaradaId")));
  const calidadNueva = leerTexto(formulario.get("calidadDeclaradaIdNuevo"));
  if (calidadNueva) {
    try {
      calidadDeclaradaId = (
        await dominio.ampliarLista(LISTA_CALIDADES_DECLARADAS, calidadNueva)
      ).id;
    } catch (error) {
      if (!(error instanceof ErrorDeDominio)) throw error;
      throw new ErrorDeDominio(error.motivo, error.message, {
        calidadDeclaradaId: error.errores.nombre ?? error.message,
      });
    }
  }

  const fechaRecepcionTexto = leerTexto(formulario.get("fechaRecepcion"));

  return {
    proveedorId: Number(leerTexto(formulario.get("proveedorId"))),
    canal: leerTexto(formulario.get("canal")) as CanalDeAbastecimiento,
    calidadDeclaradaId,
    costoCentavos: leerCentavos(formulario.get("costo")),
    transporteCentavos: formulario.get("transporte") ? leerCentavos(formulario.get("transporte")) : 0,
    fechaCompra: leerFecha(formulario.get("fechaCompra")),
    fechaRecepcion: fechaRecepcionTexto ? leerFecha(formulario.get("fechaRecepcion")) : null,
  };
}

/**
 * Lee la apertura: la fecha, los conteos y una condición de ingreso por cada
 * pieza recibida (campos `condicion-0`, `condicion-1`…, sin contar descartes).
 */
export function leerFormularioDeApertura(formulario: FormData): DatosDeApertura {
  const unidadesRecibidas = Number(leerTexto(formulario.get("unidadesRecibidas")));
  const descartes = Number(leerTexto(formulario.get("descartes")));
  const esperadas = Number.isFinite(unidadesRecibidas) && Number.isFinite(descartes)
    ? Math.max(unidadesRecibidas - descartes, 0)
    : 0;

  const condicionesDeIngreso: CondicionDePieza[] = [];
  for (let i = 0; i < esperadas; i++) {
    condicionesDeIngreso.push(leerTexto(formulario.get(`condicion-${i}`)) as CondicionDePieza);
  }

  return {
    fecha: leerFecha(formulario.get("fecha")),
    unidadesRecibidas,
    descartes,
    notaApertura: leerTexto(formulario.get("notaApertura")) || null,
    condicionesDeIngreso,
  };
}

export function leerFormularioDeCompraAParticular(formulario: FormData): DatosDeCompraAParticular {
  const condicion = leerTexto(formulario.get("condicionIngreso"));
  return {
    proveedorId: Number(leerTexto(formulario.get("proveedorId"))),
    costoDirectoCentavos: leerCentavos(formulario.get("costo")),
    condicionIngreso: condicion ? (condicion as CondicionDePieza) : null,
  };
}
