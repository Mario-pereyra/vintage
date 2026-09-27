import { env } from "cloudflare:workers";
import { data } from "react-router";

import type { TipoDeToma } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";

import type { Route } from "./+types/fotos";

/**
 * Sube, reemplaza, borra, elige portada e intercambia las fotos de una pieza.
 * Sin pantalla propia: lo llama `TomasDelPanel` (componentes/tomas-panel) con
 * `fetch`, después de redimensionar la foto en el navegador (ADR 0005). El
 * dominio manda; esta capa solo habla con R2 y traduce sus rechazos.
 */

const CLAVES = ["claveMiniatura", "claveCatalogo", "claveDetalle"] as const;

/** Una clave de objeto R2 al azar, para que una foto reemplazada no comparta
 * URL (y caché) con la anterior. */
function claveDeObjeto(codigo: string, tipo: string, variante: string): string {
  const sufijo = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `piezas/${codigo}/${tipo}-${variante}-${sufijo}.jpg`;
}

async function subirVariantes(
  codigo: string,
  tipo: string,
  formulario: FormData,
): Promise<{ claveMiniatura: string; claveCatalogo: string; claveDetalle: string }> {
  const claves = {
    claveMiniatura: claveDeObjeto(codigo, tipo, "mini"),
    claveCatalogo: claveDeObjeto(codigo, tipo, "cat"),
    claveDetalle: claveDeObjeto(codigo, tipo, "det"),
  };
  const archivos: Record<string, File> = {
    claveMiniatura: formulario.get("miniatura") as File,
    claveCatalogo: formulario.get("catalogo") as File,
    claveDetalle: formulario.get("detalle") as File,
  };
  for (const campo of CLAVES) {
    if (!(archivos[campo] instanceof File) || archivos[campo].size === 0) {
      throw new Error("Faltan una o más variantes de la foto.");
    }
  }
  await Promise.all(
    CLAVES.map((campo) =>
      env.FOTOS.put(claves[campo], archivos[campo].stream(), {
        httpMetadata: { contentType: "image/jpeg" },
      }),
    ),
  );
  return claves;
}

/** Borra del bucket las variantes que ya no usa ninguna foto (mejor esfuerzo). */
async function borrarVariantes(
  claves: { claveMiniatura: string; claveCatalogo: string; claveDetalle: string } | undefined,
) {
  if (!claves) return;
  await Promise.allSettled(CLAVES.map((campo) => env.FOTOS.delete(claves[campo])));
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const codigo = params.codigo;
  const formulario = await request.formData();
  const operacion = String(formulario.get("operacion") ?? "");
  const tipo = String(formulario.get("tipo") ?? "") as TipoDeToma;

  try {
    switch (operacion) {
      case "subir": {
        const previa = (await dominio.fotosDePieza(codigo)).find((foto) => foto.tipo === tipo);
        const claves = await subirVariantes(codigo, tipo, formulario);
        const fotos = await dominio.agregarFoto(codigo, tipo, claves);
        await borrarVariantes(previa);
        return { fotos };
      }
      case "eliminar": {
        const previa = (await dominio.fotosDePieza(codigo)).find((foto) => foto.tipo === tipo);
        const fotos = await dominio.eliminarFoto(codigo, tipo);
        await borrarVariantes(previa);
        return { fotos };
      }
      case "portada":
        return { fotos: await dominio.elegirPortada(codigo, tipo) };
      case "intercambiar": {
        const tipoB = String(formulario.get("tipoB") ?? "") as TipoDeToma;
        return { fotos: await dominio.intercambiarFotos(codigo, tipo, tipoB) };
      }
      default:
        return data({ mensaje: "Esa operación de fotos no existe." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && !("motivo" in error)) {
      return data({ mensaje: error.message }, { status: 400 });
    }
    return respuestaDeRechazo(error);
  }
}
