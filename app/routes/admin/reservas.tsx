import { Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { horaDeBolivia, tiempoRestante } from "~/componentes/hora";
import { Icono } from "~/componentes/icono";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { Route } from "./+types/reservas";
import type { BarraDelPanel } from "./layout";

export const handle = { titulo: "Reservas", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { reservas: await obtenerDominio(context).listarReservasActivas() };
}

/** Acciones rápidas de la lista: extender 15 minutos o cancelar. */
export async function action({ request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const formulario = await request.formData();
  const codigo = String(formulario.get("codigo") ?? "");
  try {
    if (formulario.get("intencion") === "cancelar") {
      await dominio.cancelarReserva(codigo);
      return { mensaje: `Reserva de ${codigo} cancelada: vuelve a estar Disponible.` };
    }
    const reserva = await dominio.extenderReserva(codigo, 15);
    return {
      mensaje: `${codigo} extendida hasta las ${horaDeBolivia(reserva.venceEn)}.`,
    };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return { mensaje: error.message };
  }
}

export default function Reservas({ loaderData, actionData }: Route.ComponentProps) {
  const { reservas } = loaderData;

  return (
    <>
      {actionData?.mensaje ? (
        <p className="ayuda" role="status">
          {actionData.mensaje}
        </p>
      ) : null}

      <BloquePanel titulo="Activas" detalle={`${reservas.length}`}>
        {reservas.length === 0 ? (
          <p className="ayuda">
            No hay reservas activas. Para reservar, abre la pieza desde{" "}
            <Link to="/admin/piezas">Piezas</Link>.
          </p>
        ) : (
          <>
            <p className="ayuda">La que vence primero, arriba.</p>
            <ul className="filas-pieza">
              {reservas.map((reserva) => (
                <li key={reserva.codigo}>
                  <Link className="fila-pieza" to={`/admin/piezas/${reserva.codigo}/reserva`}>
                    <span>
                      <span className="fila-pieza-ref">{reserva.codigo}</span>
                      <span className="fila-pieza-nombre">
                        {reserva.compradora.nombre}
                        {reserva.nombrePieza ? ` · ${reserva.nombrePieza}` : ""}
                      </span>
                    </span>
                    <span className="fila-pieza-derecha">
                      <span className="fila-pieza-precio">
                        {tiempoRestante(reserva.minutosRestantes)}
                      </span>
                      <Icono nombre="adelante" />
                    </span>
                  </Link>
                  <p className="ayuda">
                    Vence a las <span className="cifra">{horaDeBolivia(reserva.venceEn)}</span> ·{" "}
                    <a
                      href={enlaceWhatsApp(
                        reserva.compradora.whatsapp,
                        `Hola ${reserva.compradora.nombre}, te escribo por la Ref. ${reserva.codigo}.`,
                      )}
                    >
                      WhatsApp
                    </a>
                  </p>
                  <Form method="post" className="acciones-fila-sin-vista">
                    <input type="hidden" name="codigo" value={reserva.codigo} />
                    <button type="submit" name="intencion" value="extender" className="btn">
                      +15 min
                    </button>
                    <button type="submit" name="intencion" value="cancelar" className="btn">
                      Cancelar
                    </button>
                  </Form>
                </li>
              ))}
            </ul>
          </>
        )}
      </BloquePanel>
    </>
  );
}
