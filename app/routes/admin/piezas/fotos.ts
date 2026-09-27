import { env } from "cloudflare:workers";
import { data } from "react-router";

import { ErrorDeDominio, TOMAS_REQUERIDAS, type TipoDeToma } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";

import type { Route } from "./+types/fotos";

/**
 * Sube, reemplaza, borra, elige portada e intercambia las fotos de una pieza.
 * Sin pantalla propia: lo llama `TomasDelPanel` (componentes/tomas-panel) con
 * `fetch`, después de redimensionar la foto en el navegador (ADR 0005). El
 * dominio manda; esta capa solo habla con R2 y traduce sus rechazos.
 *
 * "Subir" valida la pieza y la toma ANTES de tocar R2 (con datos ya
 * validados arma la clave del objeto), y si el dominio la rechaza después de
 * subida, borra lo subido: R2 nunca queda con basura de un pedido rechazado.
 */

const CLAVES = ["claveMiniatura", "claveCatalogo", "claveDetalle"] as const;
type Clave = (typeof CLAVES)[number];

const CAMPO_DE_CLAVE: Record<Clave, string> = {
  claveMiniatura: "miniatura",
  claveCatalogo: "catalogo",
  claveDetalle: "detalle",
};

/**
 * Tope de tamaño por variante: bastante por encima de lo que genera la
 * redimensión del navegador (JPEG, lado máximo 320/960/1800 px, calidad
 * 0.80–0.88; ver utilidades/redimensionar-foto.ts), para no aceptar un
 * archivo que se coló sin pasar por ahí.
 */
const TOPE_POR_CLAVE: Record<Clave, number> = {
  claveMiniatura: 500 * 1024,
  claveCatalogo: 2 * 1024 * 1024,
  claveDetalle: 6 * 1024 * 1024,
};

type Claves = Record<Clave, string>;

function tipoValido(valor: string): valor is TipoDeToma {
  return (TOMAS_REQUERIDAS as readonly string[]).includes(valor);
}

/**
 * El formato real del archivo, mirando sus primeros bytes (nunca el
 * `Content-Type` que manda el cliente, que cualquiera puede falsear). Acepta
 * JPEG (lo único que genera hoy la redimensión) y WEBP, por si el navegador
 * cambia de formato más adelante.
 */
function esImagenValida(bytes: Uint8Array): boolean {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return jpeg || webp;
}

/** Una clave de objeto R2 al azar, para que una foto reemplazada no comparta
 * URL (y caché) con la anterior. Solo se llama con un `tipo` ya validado. */
function claveDeObjeto(codigo: string, tipo: TipoDeToma, variante: string): string {
  const sufijo = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `piezas/${codigo}/${tipo}-${variante}-${sufijo}.jpg`;
}

/** Lee y valida los 3 archivos del formulario: tamaño y bytes mágicos (nunca el `Content-Type` del cliente). */
async function leerArchivos(formulario: FormData): Promise<Record<Clave, ArrayBuffer>> {
  const buffers = {} as Record<Clave, ArrayBuffer>;
  for (const clave of CLAVES) {
    const archivo = formulario.get(CAMPO_DE_CLAVE[clave]);
    if (!(archivo instanceof File) || archivo.size === 0) {
      throw new Error("Faltan una o más variantes de la foto.");
    }
    if (archivo.size > TOPE_POR_CLAVE[clave]) {
      throw new Error("Una de las fotos pesa más de lo que genera la redimensión del navegador.");
    }
    const buffer = await archivo.arrayBuffer();
    if (buffer.byteLength < 12 || !esImagenValida(new Uint8Array(buffer, 0, 12))) {
      throw new Error("Cada foto tiene que ser JPEG o WEBP.");
    }
    buffers[clave] = buffer;
  }
  return buffers;
}

async function subirVariantes(
  codigo: string,
  tipo: TipoDeToma,
  formulario: FormData,
): Promise<Claves> {
  const buffers = await leerArchivos(formulario);
  const claves: Claves = {
    claveMiniatura: claveDeObjeto(codigo, tipo, "mini"),
    claveCatalogo: claveDeObjeto(codigo, tipo, "cat"),
    claveDetalle: claveDeObjeto(codigo, tipo, "det"),
  };
  await Promise.all(
    CLAVES.map((clave) =>
      env.FOTOS.put(claves[clave], buffers[clave], {
        httpMetadata: { contentType: "image/jpeg" },
      }),
    ),
  );
  return claves;
}

/** Borra del bucket las variantes que ya no usa ninguna foto (mejor esfuerzo). */
async function borrarVariantes(claves: Claves | undefined) {
  if (!claves) return;
  await Promise.allSettled(CLAVES.map((clave) => env.FOTOS.delete(claves[clave])));
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const codigo = params.codigo;
  const formulario = await request.formData();
  const operacion = String(formulario.get("operacion") ?? "");
  const tipoCrudo = String(formulario.get("tipo") ?? "");

  try {
    switch (operacion) {
      case "subir": {
        // La pieza y la toma se validan antes de tocar R2: `fotosDePieza`
        // rechaza (pieza_no_encontrada) si el código no existe, y el `tipo`
        // se comprueba contra las 8 tomas antes de armar ninguna clave.
        const previas = await dominio.fotosDePieza(codigo);
        if (!tipoValido(tipoCrudo)) {
          throw new ErrorDeDominio("datos_invalidos", "Esa toma no existe.", {
            tipo: "Elige una de las 8 tomas.",
          });
        }
        const previa = previas.find((foto) => foto.tipo === tipoCrudo);
        const claves = await subirVariantes(codigo, tipoCrudo, formulario);
        try {
          const fotos = await dominio.agregarFoto(codigo, tipoCrudo, claves);
          await borrarVariantes(previa);
          return { fotos };
        } catch (error) {
          // El dominio rechazó después de subir: no dejamos basura en R2.
          await borrarVariantes(claves);
          throw error;
        }
      }
      case "eliminar": {
        const previa = (await dominio.fotosDePieza(codigo)).find((foto) => foto.tipo === tipoCrudo);
        const fotos = await dominio.eliminarFoto(codigo, tipoCrudo as TipoDeToma);
        await borrarVariantes(previa);
        return { fotos };
      }
      case "portada":
        return { fotos: await dominio.elegirPortada(codigo, tipoCrudo as TipoDeToma) };
      case "intercambiar": {
        const tipoB = String(formulario.get("tipoB") ?? "");
        return {
          fotos: await dominio.intercambiarFotos(codigo, tipoCrudo as TipoDeToma, tipoB as TipoDeToma),
        };
      }
      default:
        return data({ mensaje: "Esa operación de fotos no existe." }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && !(error instanceof ErrorDeDominio)) {
      return data({ mensaje: error.message }, { status: 400 });
    }
    return respuestaDeRechazo(error);
  }
}
