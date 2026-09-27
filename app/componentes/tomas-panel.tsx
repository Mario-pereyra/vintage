import { useEffect, useRef, useState } from "react";

import { TOMAS_REQUERIDAS, type FotoDelPanel, type TipoDeToma } from "~/dominio";
import { generarVariantesDeFoto } from "~/utilidades/redimensionar-foto";

import { TOMAS } from "./galeria-tomas";
import { Icono } from "./icono";

/** La respuesta de la ruta de fotos (`admin/piezas/:codigo/fotos`). */
interface RespuestaDeFotos {
  fotos?: FotoDelPanel[];
  mensaje?: string;
}

/**
 * Habla con la ruta de fotos. Usa `XMLHttpRequest` y no `fetch` para poder
 * contar el avance de la subida, que con datos móviles tarda.
 */
function pedir(
  codigo: string,
  datos: Record<string, string | Blob>,
  alAvanzar?: (fraccion: number) => void,
): Promise<FotoDelPanel[]> {
  const formulario = new FormData();
  for (const [clave, valor] of Object.entries(datos)) formulario.set(clave, valor);
  return new Promise((resolver, rechazar) => {
    const pedido = new XMLHttpRequest();
    pedido.open("POST", `/admin/piezas/${codigo}/fotos`);
    pedido.responseType = "json";
    if (alAvanzar) {
      pedido.upload.onprogress = (evento) => {
        if (evento.lengthComputable) alAvanzar(evento.loaded / evento.total);
      };
    }
    pedido.onload = () => {
      const cuerpo = (pedido.response ?? {}) as RespuestaDeFotos;
      if (pedido.status >= 200 && pedido.status < 300 && cuerpo.fotos) resolver(cuerpo.fotos);
      else rechazar(new FallaDeFoto(causaSegunEstado(pedido.status)));
    };
    pedido.onerror = () => rechazar(new FallaDeFoto("conexion"));
    pedido.ontimeout = () => rechazar(new FallaDeFoto("conexion"));
    pedido.send(formulario);
  });
}

/**
 * Por qué no se pudo subir o cambiar una foto. La operadora nunca ve el texto
 * del navegador ni el del servidor tal cual: cada causa tiene su mensaje, y
 * solo las pasajeras invitan a probar de nuevo.
 */
type CausaDeFalla =
  | "no_es_foto"
  | "muy_pesada"
  | "rechazada"
  | "conexion"
  | "sesion"
  | "servidor";

const TEXTO_DE_FALLA: Record<CausaDeFalla, string> = {
  no_es_foto: "Ese archivo no es una foto que podamos abrir. Elegí otra.",
  muy_pesada: "La foto pesa demasiado. Elegí otra o sacala de nuevo.",
  rechazada: "La foto no es JPEG ni WEBP, o quedó demasiado pesada. Elegí otra.",
  conexion: "Se cortó la conexión. Probá de nuevo.",
  sesion: "Tu sesión venció. Volvé a entrar y probá de nuevo.",
  servidor: "El servidor no la aceptó. Probá de nuevo en un rato.",
};

class FallaDeFoto extends Error {
  constructor(readonly causa: CausaDeFalla) {
    super(TEXTO_DE_FALLA[causa]);
  }
}

function causaSegunEstado(estado: number): CausaDeFalla {
  if (estado === 0) return "conexion";
  if (estado === 401 || estado === 403) return "sesion";
  if (estado === 413) return "muy_pesada";
  if (estado >= 400 && estado < 500) return "rechazada";
  return "servidor";
}

/**
 * Tope del archivo original, antes de achicarlo: una foto de celular pesa
 * pocos MB; algo mucho más grande no es una foto o ahoga el navegador.
 */
const TOPE_DEL_ORIGINAL = 40 * 1024 * 1024;

/** Achica la foto en el navegador; si no se puede abrir, lo dice sin jerga. */
async function achicar(archivo: File) {
  if (archivo.type && !archivo.type.startsWith("image/")) throw new FallaDeFoto("no_es_foto");
  if (archivo.size > TOPE_DEL_ORIGINAL) throw new FallaDeFoto("muy_pesada");
  try {
    return await generarVariantesDeFoto(archivo);
  } catch {
    // createImageBitmap no pudo decodificarla (no es una imagen, está
    // dañada o el navegador no conoce el formato).
    throw new FallaDeFoto("no_es_foto");
  }
}

function causaDe(error: unknown): CausaDeFalla {
  return error instanceof FallaDeFoto ? error.causa : "servidor";
}

/** Dónde va cada foto que se elija en la cámara o la galería. */
type Destino = { tipo: TipoDeToma } | { enOrden: true };

/** El avance de una foto: en cola, achicándose en el celular o subiendo. */
interface Subida {
  etapa: "en_cola" | "achicando" | "subiendo";
  /** La foto elegida, como vista previa mientras sube. */
  vista: string;
  /** De 0 a 1, mientras sube. */
  avance: number;
}

const NUMERO = new Map(TOMAS_REQUERIDAS.map((tipo, indice) => [tipo, indice + 1]));
const NOMBRE = new Map(TOMAS_REQUERIDAS.map((tipo, indice) => [tipo, TOMAS[indice]]));

/** En el botón de la cámara a 390 px, el nombre largo parte la línea. */
const NOMBRE_CORTO: Record<TipoDeToma, string> = {
  frente: "Frente",
  dorso: "Dorso",
  lateral: "Lateral",
  base_y_esquinas: "Base",
  interior: "Interior",
  herrajes_y_cierre: "Herrajes",
  asas: "Asas",
  puesta: "Puesta",
};

const TEXTO_DE_ETAPA: Record<Subida["etapa"], string> = {
  en_cola: "En cola",
  achicando: "Achicando…",
  subiendo: "Subiendo…",
};

/**
 * Tomas del panel: la grilla de las 8 tomas fijas (4 × 2, formato 4:5) y,
 * debajo, lo que se puede hacer ahora. Sin `codigo` (la pieza todavía no se
 * guardó) solo muestra el orden.
 *
 * Sin toma elegida, se saca la foto de la próxima toma vacía o se eligen
 * varias de la galería, que llenan las vacías en orden. Tocar una toma la
 * elige: vacía, se le saca o elige su foto; llena, se cambia, se quita o se
 * usa de portada, y tocar otra toma llena intercambia las dos fotos. Cada
 * foto se achica en el navegador (ADR 0005) y el hueco muestra su avance.
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
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const destino = useRef<Destino>({ enOrden: true });
  const [subidas, setSubidas] = useState<Partial<Record<TipoDeToma, Subida>>>({});
  const [elegida, setElegida] = useState<TipoDeToma | null>(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  // Libera las vistas previas que queden al salir de la pantalla.
  const vistas = useRef(new Set<string>());
  useEffect(() => {
    const abiertas = vistas.current;
    return () => abiertas.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  if (!codigo) {
    return (
      <ol className="tomas" aria-label="Orden de las 8 tomas">
        {TOMAS_REQUERIDAS.map((tipo, indice) => (
          <li key={tipo}>
            <span className="hueco">
              <span className="hueco-numero">{indice + 1}</span>
              <span className="hueco-nombre">{TOMAS[indice]}</span>
            </span>
          </li>
        ))}
      </ol>
    );
  }
  // Los closures de abajo capturan `codigo` como `string | null`; esta copia
  // ya angosta se resuelve una sola vez, aquí.
  const codigoDeLaPieza = codigo;

  const fotoDe = (tipo: TipoDeToma) => fotos.find((foto) => foto.tipo === tipo);
  const subiendo = Object.keys(subidas).length > 0;
  const ocupado = subiendo || trabajando;
  const vacias = TOMAS_REQUERIDAS.filter((tipo) => !fotoDe(tipo) && !subidas[tipo]);
  const proxima = vacias[0] ?? null;
  const fotoElegida = elegida ? fotoDe(elegida) : undefined;

  function actualizar(tipo: TipoDeToma, cambio: Partial<Subida>) {
    setSubidas((previas) => {
      const actual = previas[tipo];
      return actual ? { ...previas, [tipo]: { ...actual, ...cambio } } : previas;
    });
  }

  function terminar(tipo: TipoDeToma) {
    setSubidas((previas) => {
      const { [tipo]: hecha, ...resto } = previas;
      if (hecha) {
        URL.revokeObjectURL(hecha.vista);
        vistas.current.delete(hecha.vista);
      }
      return resto;
    });
  }

  /** Achica y sube cada foto a su toma, de a una, para no ahogar los datos. */
  async function subir(pares: readonly (readonly [TipoDeToma, File])[]) {
    setError(null);
    setElegida(null);
    setConfirmarQuitar(false);
    const nuevas: Partial<Record<TipoDeToma, Subida>> = {};
    for (const [tipo, archivo] of pares) {
      const vista = URL.createObjectURL(archivo);
      vistas.current.add(vista);
      nuevas[tipo] = { etapa: "en_cola", vista, avance: 0 };
    }
    setSubidas((previas) => ({ ...previas, ...nuevas }));

    const fallidas: string[] = [];
    let causa: CausaDeFalla = "servidor";
    for (const [tipo, archivo] of pares) {
      try {
        actualizar(tipo, { etapa: "achicando" });
        const variantes = await achicar(archivo);
        actualizar(tipo, { etapa: "subiendo" });
        const resultado = await pedir(
          codigoDeLaPieza,
          {
            operacion: "subir",
            tipo,
            miniatura: variantes.miniatura,
            catalogo: variantes.catalogo,
            detalle: variantes.detalle,
          },
          (avance) => actualizar(tipo, { avance }),
        );
        onCambio(resultado);
      } catch (e) {
        fallidas.push(`${NUMERO.get(tipo)} ${NOMBRE.get(tipo)}`);
        causa = causaDe(e);
      } finally {
        terminar(tipo);
      }
    }
    if (fallidas.length > 0) {
      const cuales = new Intl.ListFormat("es", { type: "conjunction" }).format(fallidas);
      setError(
        `${fallidas.length === 1 ? "No se subió la toma" : "No se subieron las tomas"} ${cuales}. ${TEXTO_DE_FALLA[causa]}`,
      );
    }
  }

  /** Portada, quitar e intercambiar: una operación sobre fotos ya subidas. */
  async function operar(datos: Record<string, string>, siFalla: string) {
    setError(null);
    setTrabajando(true);
    try {
      onCambio(await pedir(codigoDeLaPieza, datos));
      return true;
    } catch (e) {
      const causa = causaDe(e);
      // Un 400 aquí no es la foto: las tomas cambiaron en otra pestaña.
      setError(
        `${siFalla} ${
          causa === "rechazada"
            ? "Las tomas cambiaron mientras tanto. Recargá la pantalla y probá de nuevo."
            : TEXTO_DE_FALLA[causa]
        }`,
      );
      return false;
    } finally {
      setTrabajando(false);
    }
  }

  function abrir(entrada: "camara" | "galeria", a: Destino) {
    destino.current = a;
    setAviso(null);
    const elemento = entrada === "camara" ? camara.current : galeria.current;
    if (elemento) elemento.multiple = entrada === "galeria" && "enOrden" in a;
    elemento?.click();
  }

  function alElegirArchivos(archivos: File[]) {
    if (archivos.length === 0) return;
    const a = destino.current;
    if ("tipo" in a) {
      void subir([[a.tipo, archivos[0]]]);
      return;
    }
    const pares = vacias.slice(0, archivos.length).map((tipo, i) => [tipo, archivos[i]] as const);
    if (archivos.length > vacias.length) {
      setAviso(
        vacias.length === 1
          ? `Quedaba 1 toma vacía: se usó la primera foto.`
          : `Quedaban ${vacias.length} tomas vacías: se usaron las primeras ${vacias.length} fotos.`,
      );
    }
    void subir(pares);
  }

  function alTocar(tipo: TipoDeToma) {
    if (ocupado) return;
    setConfirmarQuitar(false);
    setAviso(null);
    if (elegida === tipo) {
      setElegida(null);
      return;
    }
    // Dos tomas con foto, una detrás de la otra: se intercambian.
    if (elegida && fotoElegida && fotoDe(tipo)) {
      const primera = elegida;
      setElegida(null);
      void operar(
        { operacion: "intercambiar", tipo: primera, tipoB: tipo },
        "No se pudieron intercambiar las fotos.",
      );
      return;
    }
    setElegida(tipo);
  }

  return (
    <div className="tomas-panel">
      <ol className="tomas" aria-label="Las 8 tomas">
        {TOMAS_REQUERIDAS.map((tipo, indice) => {
          const foto = fotoDe(tipo);
          const subida = subidas[tipo];
          const imagen = subida?.vista ?? (foto ? `${r2PublicUrl}/${foto.claveMiniatura}` : null);
          const estado = subida
            ? `${TEXTO_DE_ETAPA[subida.etapa].toLowerCase()}`
            : foto
              ? foto.portada
                ? "con foto, portada"
                : "con foto"
              : "vacía";
          return (
            <li key={tipo}>
              <button
                type="button"
                className="hueco"
                data-lleno={imagen ? "" : undefined}
                aria-pressed={elegida === tipo}
                aria-label={`Toma ${indice + 1}, ${TOMAS[indice]}: ${estado}`}
                aria-busy={subida ? true : undefined}
                onClick={() => alTocar(tipo)}
                disabled={ocupado && !subida}
              >
                {imagen ? <img src={imagen} alt="" loading="lazy" decoding="async" /> : null}
                <span className="hueco-numero">{indice + 1}</span>
                {foto?.portada && !subida ? <span className="hueco-portada">Portada</span> : null}
                <span className="hueco-nombre">{TOMAS[indice]}</span>
                {subida ? (
                  <span className="hueco-avance">
                    <span>{TEXTO_DE_ETAPA[subida.etapa]}</span>
                    <span className="hueco-barra">
                      <span
                        style={{
                          transform: `scaleX(${subida.etapa === "subiendo" ? Math.max(0.06, subida.avance) : 0})`,
                        }}
                      />
                    </span>
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <input
        ref={camara}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(evento) => {
          const archivos = [...(evento.target.files ?? [])];
          evento.target.value = "";
          alElegirArchivos(archivos);
        }}
      />
      <input
        ref={galeria}
        type="file"
        accept="image/*"
        hidden
        onChange={(evento) => {
          const archivos = [...(evento.target.files ?? [])];
          evento.target.value = "";
          alElegirArchivos(archivos);
        }}
      />

      <div className="tomas-acciones">
        {elegida ? (
          <>
            <div className="toma-elegida">
              <p>
                <span className="cifra">{NUMERO.get(elegida)}</span> {NOMBRE.get(elegida)}
                {fotoElegida?.portada ? <em>Portada</em> : null}
              </p>
              <button
                type="button"
                className="toma-elegida-cerrar"
                aria-label="Dejar de elegir esta toma"
                onClick={() => {
                  setElegida(null);
                  setConfirmarQuitar(false);
                }}
              >
                <Icono nombre="cerrar" />
              </button>
            </div>
            <div className="tomas-botones">
              <button
                type="button"
                className="btn"
                disabled={ocupado}
                onClick={() => abrir("camara", { tipo: elegida })}
              >
                <Icono nombre="camara" />
                {fotoElegida ? "Sacar otra" : "Sacar foto"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={ocupado}
                onClick={() => abrir("galeria", { tipo: elegida })}
              >
                <Icono nombre="galeria" />
                Galería
              </button>
              {fotoElegida ? (
                <>
                  <button
                    type="button"
                    className="btn btn-suave"
                    disabled={ocupado || fotoElegida.portada}
                    onClick={() =>
                      void operar(
                        { operacion: "portada", tipo: elegida },
                        "No se pudo cambiar la portada.",
                      )
                    }
                  >
                    {fotoElegida.portada ? "Es la portada" : "Usar de portada"}
                  </button>
                  <button
                    type="button"
                    className={confirmarQuitar ? "btn btn-quitar-confirmar" : "btn btn-suave"}
                    disabled={ocupado}
                    onClick={async () => {
                      if (!confirmarQuitar) {
                        setConfirmarQuitar(true);
                        return;
                      }
                      const tipo = elegida;
                      if (
                        await operar({ operacion: "eliminar", tipo }, "No se pudo quitar la foto.")
                      ) {
                        setElegida(null);
                      }
                      setConfirmarQuitar(false);
                    }}
                  >
                    {confirmarQuitar ? "Sí, quitarla" : "Quitar"}
                  </button>
                </>
              ) : null}
            </div>
            <p className="tomas-nota" aria-live="polite">
              {trabajando
                ? "Guardando…"
                : confirmarQuitar
                  ? "La foto se borra. Tocá de nuevo para confirmar."
                  : fotoElegida
                    ? fotos.length > 1
                      ? "¿Quedó en otro lugar? Tocá otra toma con foto y se intercambian."
                      : null
                    : "Sacala ahora o elegila de la galería."}
            </p>
          </>
        ) : (
          <>
            {proxima ? (
              <div className="tomas-botones">
                <button
                  type="button"
                  className="btn"
                  disabled={ocupado}
                  aria-label={`Sacar la toma ${NUMERO.get(proxima)}, ${NOMBRE.get(proxima)}`}
                  onClick={() => abrir("camara", { tipo: proxima })}
                >
                  <Icono nombre="camara" />
                  <span>
                    Sacar <span className="cifra">{NUMERO.get(proxima)}</span>{" "}
                    {NOMBRE_CORTO[proxima]}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={ocupado}
                  onClick={() => abrir("galeria", { enOrden: true })}
                >
                  <Icono nombre="galeria" />
                  De la galería
                </button>
              </div>
            ) : null}
            <p className="tomas-nota" aria-live="polite">
              {subiendo
                ? "Las fotos se achican en tu celular antes de subir. No cierres esta pantalla."
                : trabajando
                  ? "Guardando…"
                  : proxima
                    ? "De la galería se llenan las tomas vacías en orden. Se achican en tu celular antes de subir."
                    : "Están las 8 tomas. Tocá una para cambiarla, quitarla, usarla de portada o intercambiarla."}
            </p>
          </>
        )}
        {aviso ? <p className="tomas-nota">{aviso}</p> : null}
        {error ? (
          <p className="campo-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
