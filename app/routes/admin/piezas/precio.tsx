import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoPrecio } from "~/componentes/campos";
import { Renglon, Renglones } from "~/componentes/renglon";
import { formatearPrecio } from "~/componentes/total";
import { ErrorDeDominio } from "~/dominio";
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
    return { mensaje: "Precio actualizado: se guardó en el historial." };
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

export default function PrecioDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, historial } = loaderData;
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const errores = actionData && "errores" in actionData ? (actionData.errores ?? {}) : {};
  const publicada = pieza.estado !== "en_preparacion";
  const [precio, setPrecio] = useState(
    pieza.precioCentavos != null ? String(pieza.precioCentavos / 100) : "",
  );

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
            Editar pieza
          </Link>
        </div>
      </div>

      {!publicada ? (
        <BloquePanel titulo="Precio publicado" nuncaSePublica>
          <p className="ayuda">
            Todavía está En preparación: cambia el precio desde la pieza. El
            historial solo empieza a guardarse cuando ya está publicada.
          </p>
        </BloquePanel>
      ) : (
        <Form method="post">
          <BloquePanel titulo="Cambiar el precio publicado">
            <Renglones>
              <Renglon etiqueta="Precio actual" cifra>
                {pieza.precioCentavos != null ? formatearPrecio(pieza.precioCentavos / 100) : "—"}
              </Renglon>
            </Renglones>
            <Campo etiqueta="Nuevo precio publicado" para="precio">
              <CampoPrecio
                id="precio"
                name="precio"
                value={precio}
                onChange={(evento) => setPrecio(evento.target.value)}
                aria-invalid={errores.precioCentavos ? true : undefined}
              />
              {errores.precioCentavos ? (
                <p className="campo-error" role="alert">
                  {errores.precioCentavos}
                </p>
              ) : null}
            </Campo>
            {actionData?.mensaje ? (
              <p
                className={errores.precioCentavos ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
                role={errores.precioCentavos ? "alert" : "status"}
              >
                {actionData.mensaje}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar el nuevo precio"}
            </button>
          </BloquePanel>
        </Form>
      )}

      <BloquePanel
        titulo="Historial de precios"
        detalle={historial.length > 0 ? `${historial.length}` : undefined}
      >
        {historial.length === 0 ? (
          <p className="ayuda">El precio publicado todavía no cambió.</p>
        ) : (
          <Renglones>
            {historial.map((cambio) => (
              <Renglon key={cambio.fecha.toISOString()} etiqueta={fecha(cambio.fecha)} cifra>
                {formatearPrecio(cambio.precioCentavos / 100)}
              </Renglon>
            ))}
          </Renglones>
        )}
      </BloquePanel>
    </>
  );
}
