import { useRef, useState } from "react";

import { TOMAS_REQUERIDAS, type FotoDelPanel, type TipoDeToma } from "~/dominio";
import { generarVariantesDeFoto } from "~/utilidades/redimensionar-foto";

import { TOMAS } from "./galeria-tomas";

/** La respuesta de la ruta de fotos (`admin/piezas/:codigo/fotos`). */
interface RespuestaDeFotos {
  fotos?: FotoDelPanel[];
  mensaje?: string;
}

async function pedir(codigo: string, datos: Record<string, string | Blob>): Promise<FotoDelPanel[]> {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(datos)) formulario.set(clave, valor);
  const respuesta = await fetch(`/admin/piezas/${codigo}/fotos`, {
    method: "POST",
    body: formulario,
  });
  const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaDeFotos;
  if (!respuesta.ok || !cuerpo.fotos) {
    throw new Error(cuerpo.mensaje ?? "No se pudo actualizar la foto.");
  }
  return cuerpo.fotos;
}

/**
 * Tomas del panel: grilla de las 8 tomas fijas (PRODUCT.md), con el número y
 * el nombre de cada una. Sin `codigo` (la pieza todavía no se guardó) solo
 * muestra el orden. Con `codigo`, cada hueco sube su foto desde la cámara o
 * la galería (redimensionada en el navegador antes de subirla), y el hueco
 * lleno permite elegirlo como portada, quitarlo o tocar otro hueco lleno para
 * intercambiar las dos fotos entre sí.
 */
export function TomasDelPanel({
  codigo,
  fotos,
  r2PublicUrl,
  onCambio,
}: {
  codigo: string | null;
  fotos: readonly FotoDelPanel[];
  r2PublicUrl: string;
  onCambio: (fotos: FotoDelPanel[]) => void;
}) {
  const entradas = useRef<Partial<Record<TipoDeToma, HTMLInputElement | null>>>({});
  const [subiendo, setSubiendo] = useState<TipoDeToma | null>(null);
  const [seleccionada, setSeleccionada] = useState<TipoDeToma | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!codigo) {
    return (
      <ol className="tomas" aria-label="Orden de las 8 tomas">
        {TOMAS_REQUERIDAS.map((tipo, indice) => (
          <li key={tipo} className="hueco">
            <span className="hueco-numero">{indice + 1}</span>
            <span className="hueco-nombre">{TOMAS[indice]}</span>
          </li>
        ))}
      </ol>
    );
  }
  // Los closures de abajo capturan `codigo` como `string | null`; esta copia
  // ya angosta se resuelve una sola vez, aquí.
  const codigoDeLaPieza = codigo;

  async function subir(tipo: TipoDeToma, archivo: File) {
    setError(null);
    setSubiendo(tipo);
    try {
      const variantes = await generarVariantesDeFoto(archivo);
      onCambio(
        await pedir(codigoDeLaPieza, {
          operacion: "subir",
          tipo,
          miniatura: variantes.miniatura,
          catalogo: variantes.catalogo,
          detalle: variantes.detalle,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la foto.");
    } finally {
      setSubiendo(null);
    }
  }

  async function eliminar(tipo: TipoDeToma) {
    setError(null);
    try {
      onCambio(await pedir(codigoDeLaPieza, { operacion: "eliminar", tipo }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar la foto.");
    }
  }

  async function elegirPortada(tipo: TipoDeToma) {
    setError(null);
    try {
      onCambio(await pedir(codigoDeLaPieza, { operacion: "portada", tipo }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cambiar la portada.");
    }
  }

  async function alTocar(tipo: TipoDeToma, tieneFoto: boolean) {
    if (!tieneFoto || subiendo) return;
    if (!seleccionada) {
      setSeleccionada(tipo);
      return;
    }
    if (seleccionada === tipo) {
      setSeleccionada(null);
      return;
    }
    setError(null);
    const otra = seleccionada;
    setSeleccionada(null);
    try {
      onCambio(await pedir(codigoDeLaPieza, { operacion: "intercambiar", tipo: otra, tipoB: tipo }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron intercambiar las fotos.");
    }
  }

  return (
    <>
      <ol className="tomas" aria-label="Las 8 tomas: tocá dos con foto para intercambiarlas">
        {TOMAS_REQUERIDAS.map((tipo, indice) => {
          const foto = fotos.find((f) => f.tipo === tipo);
          return (
            <li key={tipo} className={foto ? "hueco hueco-lleno" : "hueco"}>
              <button
                type="button"
                className="hueco-boton"
                aria-pressed={seleccionada === tipo}
                onClick={() => alTocar(tipo, Boolean(foto))}
                disabled={!foto || subiendo !== null}
              >
                {foto ? (
                  <img src={`${r2PublicUrl}/${foto.claveMiniatura}`} alt="" loading="lazy" />
                ) : null}
                <span className="hueco-numero">{indice + 1}</span>
                <span className="hueco-nombre">{TOMAS[indice]}</span>
              </button>

              <input
                ref={(elemento) => {
                  entradas.current[tipo] = elemento;
                }}
                type="file"
                accept="image/*"
                hidden
                onChange={(evento) => {
                  const archivo = evento.target.files?.[0];
                  evento.target.value = "";
                  if (archivo) void subir(tipo, archivo);
                }}
              />
              <button
                type="button"
                className="hueco-subir"
                onClick={() => entradas.current[tipo]?.click()}
                disabled={subiendo !== null}
              >
                {subiendo === tipo ? "Subiendo…" : foto ? "Cambiar" : "Subir"}
              </button>

              {foto ? (
                <>
                  <button
                    type="button"
                    className={foto.portada ? "hueco-portada hueco-portada-activa" : "hueco-portada"}
                    onClick={() => elegirPortada(tipo)}
                    disabled={foto.portada}
                  >
                    {foto.portada ? "Portada" : "Usar como portada"}
                  </button>
                  <button type="button" className="hueco-quitar" onClick={() => eliminar(tipo)}>
                    Quitar
                  </button>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
      {error ? (
        <p className="campo-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
