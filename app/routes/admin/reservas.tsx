import { Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { horaDeBolivia } from "~/componentes/hora";
import { Icono } from "~/componentes/icono";
import { TiempoRestante, useRefrescarCada } from "~/componentes/tiempo-restante";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { Route } from "./+types/reservas";
import type { BarraDelPanel } from "./layout";

export const handle = { titulo: "Reservas", volverA: "/admin" } satisfies BarraDelPanel;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Reservas — Vintage Secret's" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  return { reservas: await obtenerDominio(context).listarReservasActivas() };
}

/** Minutos que suma el botón rápido de la lista. */
const EXTENSION_RAPIDA = 15;

/**
 * La acción rápida de la lista: extender 15 minutos. Cancelar se hace desde la
 * reserva de la pieza, para que un toque apurado durante un live no libere
 * una pieza por error.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const formulario = await request.formData();
  const codigo = String(formulario.get("codigo") ?? "");
  try {
    const reserva = await obtenerDominio(context).extenderReserva(codigo, EXTENSION_RAPIDA);
    return { mensaje: `${codigo}: ahora vence a las ${horaDeBolivia(reserva.venceEn)}.` };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return { mensaje: error.message };
  }
}

export default function Reservas({ loaderData, actionData }: Route.ComponentProps) {
  const { reservas } = loaderData;
  const navegacion = useNavigation();
  const extendiendo =
    navegacion.state !== "idle" ? navegacion.formData?.get("codigo")?.toString() : undefined;

  useRefrescarCada(30, reservas.length > 0);

  return (
    <>
      <p className="panel-nota" role="status">
        {actionData?.mensaje ??
          (reservas.length > 0
            ? "La que vence primero, arriba. Se actualiza sola cada 30 segundos."
            : null)}
      </p>

      <BloquePanel titulo="Activas" detalle={`${reservas.length}`}>
        {reservas.length === 0 ? (
          <div className="reservas-vacio">
            <p>No hay piezas reservadas ahora.</p>
            <p className="ayuda">
              Para reservar, abre una pieza Disponible y toca «Reserva e interesadas».
            </p>
            <Link className="btn btn-ancho" to="/admin/piezas">
              Ver piezas
              <Icono nombre="adelante" />
            </Link>
          </div>
        ) : (
          <ol className="reservas">
            {reservas.map((reserva) => (
              <li key={reserva.codigo} className="reserva">
                <TiempoRestante
                  minutos={reserva.minutosRestantes}
                  venceEn={reserva.venceEn}
                />
                <Link
                  className="reserva-pieza"
                  to={`/admin/piezas/${reserva.codigo}/reserva`}
                >
                  <span className="reserva-ref">
                    {reserva.codigo}
                    <Icono nombre="adelante" />
                  </span>
                  <span className="reserva-compradora">{reserva.compradora.nombre}</span>
                  <span className="reserva-detalle">
                    {reserva.nombrePieza ?? "Sin nombre todavía"}
                    {reserva.origen === "live" ? " · live" : ""}
                    {reserva.conPagoPrevio ? " · con pago previo" : ""}
                  </span>
                </Link>
                <Form method="post" className="reserva-acciones">
                  <input type="hidden" name="codigo" value={reserva.codigo} />
                  <button
                    type="submit"
                    className="btn"
                    disabled={extendiendo === reserva.codigo}
                    aria-label={`Extender ${EXTENSION_RAPIDA} minutos la reserva de ${reserva.codigo}`}
                  >
                    <span className="cifra">+{EXTENSION_RAPIDA} min</span>
                  </button>
                  <a
                    className="btn"
                    href={enlaceWhatsApp(
                      reserva.compradora.whatsapp,
                      `Hola ${reserva.compradora.nombre}, te escribo por la Ref. ${reserva.codigo}.`,
                    )}
                  >
                    <Icono nombre="chat" />
                    Escribirle
                  </a>
                </Form>
              </li>
            ))}
          </ol>
        )}
      </BloquePanel>
    </>
  );
}
