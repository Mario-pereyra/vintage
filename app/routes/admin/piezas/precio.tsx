import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoPrecio } from "~/componentes/campos";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { formatearPrecio, Total } from "~/componentes/total";
import { ErrorDeDominio, type PiezaDelPanel } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/precio";

export const handle = {
  titulo: "Precio publicado",
  volverA: "/admin/piezas",
} satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const pieza = await dominio.piezaDelPanel(params.codigo);
  if (!pieza) throw data(null, { status: 404 });
  const historial = await dominio.historialDePrecio(pieza.codigo);
  return { pieza, historial };
}

/** "150" o "150,50" en bolivianos → centavos enteros; vacío o inválido → null. */
function leerPrecio(valor: FormDataEntryValue | null): number | null {
  const texto = String(valor ?? "").trim().replace(",", ".");
  if (!texto || !/^\d+(\.\d+)?$/.test(texto)) return null;
  return Math.round(Number(texto) * 100);
}

export async function action({ params, request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const formulario = await request.formData();
  try {
    await dominio.cambiarPrecioPublicado(
      params.codigo,
      leerPrecio(formulario.get("precio")) ?? Number.NaN,
    );
    return { mensaje: "Precio cambiado. El anterior quedó en el historial." };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return data(
      { mensaje: error.message, errores: { ...error.errores } },
      { status: 400 },
    );
  }
}

function fecha(valor: Date) {
  return valor.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  });
}

const TEXTO_DEL_ESTADO: Record<PiezaDelPanel["estado"], string> = {
  en_preparacion: "En preparación",
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  retirada: "Retirada",
};

/** "Rebaja de Bs 30 (−17 %)" o "Sube Bs 20 (+13 %)", en centavos. */
function diferencia(antes: number, despues: number): string {
  const delta = despues - antes;
  const porcentaje = Math.round((Math.abs(delta) / antes) * 100);
  const monto = formatearPrecio(Math.abs(delta) / 100);
  return delta < 0 ? `Rebaja de ${monto} (−${porcentaje} %)` : `Sube ${monto} (+${porcentaje} %)`;
}

/** "−Bs 30" o "+Bs 20": el cambio respecto del precio anterior del historial. */
function cambioCorto(antes: number, despues: number): string {
  const delta = despues - antes;
  return `${delta < 0 ? "−" : "+"}${formatearPrecio(Math.abs(delta) / 100)}`;
}

export default function PrecioDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, historial } = loaderData;
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const errores = actionData && "errores" in actionData ? (actionData.errores ?? {}) : {};
  const publicada = pieza.estado !== "en_preparacion";
  const actual = pieza.precioCentavos;
  // El historial va del más reciente al más viejo: el segundo es el anterior.
  const anterior =
    historial.length > 1 && historial[0].precioCentavos === actual
      ? historial[1].precioCentavos
      : undefined;

  const [precio, setPrecio] = useState("");
  const [ultimoResultado, setUltimoResultado] = useState(actionData);
  if (actionData !== ultimoResultado) {
    setUltimoResultado(actionData);
    // Guardado: el campo vuelve a quedar vacío, listo para otro cambio.
    if (actionData && !("errores" in actionData)) setPrecio("");
  }
  const nuevo = precio.trim() ? leerPrecio(precio) : null;
  const motivo =
    !precio.trim()
      ? "Escribe el nuevo precio"
      : nuevo === null || nuevo <= 0
        ? "Escribe un precio en bolivianos, por ejemplo 150"
        : nuevo === actual
          ? "Es el mismo precio que ya tiene"
          : undefined;

  return (
    <>
      <div className="pieza-cabecera">
        <div>
          <p className="pieza-cabecera-ref">
            <span>Ref.</span>
            {pieza.codigo}
          </p>
          <p className="pieza-cabecera-detalle">{pieza.nombre ?? "Sin nombre todavía"}</p>
          <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}`}>
            Volver a la pieza
            <Icono nombre="adelante" />
          </Link>
        </div>
        <Sello texto={TEXTO_DEL_ESTADO[pieza.estado]} />
      </div>

      {!publicada ? (
        <BloquePanel titulo="Precio publicado">
          <p className="ayuda">
            Todavía está En preparación: su precio se cambia desde la pieza, sin dejar
            rastro. El historial empieza a guardarse cuando se publica.
          </p>
          <Link className="btn btn-ancho" to={`/admin/piezas/${pieza.codigo}`}>
            Ir a la pieza
          </Link>
        </BloquePanel>
      ) : (
        <Form method="post">
          <BloquePanel titulo="Precio publicado">
            {actual != null ? (
              <div className="precio-vigente">
                <Total
                  precio={actual / 100}
                  precioAnterior={anterior != null ? anterior / 100 : undefined}
                />
              </div>
            ) : null}

            <div className="precio-nuevo">
              <Campo etiqueta="Nuevo precio" para="precio">
                <CampoPrecio
                  id="precio"
                  name="precio"
                  value={precio}
                  onChange={(evento) => setPrecio(evento.target.value)}
                  aria-invalid={errores.precioCentavos ? true : undefined}
                  aria-describedby="precio-cambio"
                />
                <p className="derivado" id="precio-cambio" aria-live="polite">
                  {nuevo != null && nuevo > 0 && actual != null && nuevo !== actual
                    ? diferencia(actual, nuevo)
                    : null}
                </p>
                {errores.precioCentavos ? (
                  <p className="campo-error" role="alert">
                    {errores.precioCentavos}
                  </p>
                ) : null}
              </Campo>
            </div>

            {actionData?.mensaje ? (
              <p
                className={errores.precioCentavos ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
                role={errores.precioCentavos ? "alert" : "status"}
              >
                {actionData.mensaje}
              </p>
            ) : null}
            {motivo ? <p className="acciones-motivo precio-motivo">{motivo}</p> : null}
            <button
              type="submit"
              className="btn btn-primario btn-ancho precio-guardar"
              disabled={enviando || motivo !== undefined}
            >
              {enviando ? "Guardando…" : "Cambiar el precio"}
            </button>
          </BloquePanel>
        </Form>
      )}

      <BloquePanel
        titulo="Historial de precios"
        detalle={historial.length > 0 ? `${historial.length} precios` : undefined}
      >
        {historial.length === 0 ? (
          <p className="ayuda">
            {publicada && actual != null && pieza.publicadaEn ? (
              <>
                Conserva el precio con el que se publicó:{" "}
                <span className="cifra">{formatearPrecio(actual / 100)}</span> desde el{" "}
                <span className="cifra">{fecha(pieza.publicadaEn)}</span>. Cada cambio queda
                aquí, con su fecha.
              </>
            ) : (
              "Cada cambio del precio publicado queda aquí, con su fecha."
            )}
          </p>
        ) : (
          <Renglones>
            {historial.map((cambio, indice) => {
              const previo = historial[indice + 1];
              const vigente = indice === 0;
              return (
                <Renglon
                  key={cambio.fecha.toISOString()}
                  etiqueta={
                    <span className={vigente ? "historial-fecha historial-vigente" : "historial-fecha"}>
                      {fecha(cambio.fecha)}
                    </span>
                  }
                  cifra
                  aclaracion={
                    vigente
                      ? previo
                        ? `vigente · ${cambioCorto(previo.precioCentavos, cambio.precioCentavos)}`
                        : "vigente"
                      : previo
                        ? cambioCorto(previo.precioCentavos, cambio.precioCentavos)
                        : "al publicar"
                  }
                >
                  <span className={vigente ? "historial-precio-vigente" : "historial-precio"}>
                    {formatearPrecio(cambio.precioCentavos / 100)}
                  </span>
                </Renglon>
              );
            })}
          </Renglones>
        )}
      </BloquePanel>
    </>
  );
}
