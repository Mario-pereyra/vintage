import { data, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { horaDeBolivia } from "~/componentes/hora";
import { Icono } from "~/componentes/icono";
import { MarcaVencidas } from "~/componentes/marca-vencidas";
import { Renglon, Renglones } from "~/componentes/renglon";
import type { ReglaDeCompradora } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import { bolivianos, fechaCortaDeBolivia, TEXTO_DEL_CANAL } from "../textos-de-venta";
import type { Route } from "./+types/detalle";

export const handle = { titulo: "Compradora", volverA: "/admin/compradoras" } satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const historial = await obtenerDominio(context).historialDeCompradora(params.id);
  if (!historial) throw data(null, { status: 404 });
  return historial;
}

/** Si se le puede reservar, según sus reservas vencidas (la regla del dominio). */
const TEXTO_DE_LA_REGLA: Record<ReglaDeCompradora, string> = {
  libre: "Sí",
  aviso: "Sí, avisándole del plazo",
  pago_previo: "Solo si paga antes",
  bloqueada: "Ya no se le reserva",
};

const TEXTO_DEL_ORIGEN = { live: "En un live", fuera_de_live: "Fuera de live" } as const;

export default function DetalleDeCompradora({ loaderData }: Route.ComponentProps) {
  const { compradora, compras, reservasVencidas } = loaderData;

  return (
    <>
      <BloquePanel titulo={compradora.nombre} nuncaSePublica>
        <Renglones>
          <Renglon etiqueta="WhatsApp" cifra>
            +{compradora.whatsapp}
          </Renglon>
          <Renglon etiqueta="Compras" cifra>
            {compras.length}
          </Renglon>
          <Renglon etiqueta="Reservas vencidas" cifra>
            {compradora.reservasVencidas}
          </Renglon>
          <Renglon etiqueta="¿Reservarle?">
            {compradora.regla === "libre" ? (
              TEXTO_DE_LA_REGLA.libre
            ) : (
              <b>{TEXTO_DE_LA_REGLA[compradora.regla]}</b>
            )}
          </Renglon>
        </Renglones>
        <a
          className="btn btn-ancho compradora-escribir"
          href={enlaceWhatsApp(compradora.whatsapp, `Hola ${compradora.nombre}.`)}
        >
          <Icono nombre="chat" />
          Escribirle por WhatsApp
        </a>
      </BloquePanel>

      <BloquePanel titulo="Compras" detalle={`${compras.length}`}>
        {compras.length === 0 ? (
          <p className="ayuda historial-vacio">Todavía no le registraste ninguna venta.</p>
        ) : (
          <ul className="filas-pieza">
            {compras.map((venta) => (
              <li key={venta.codigo}>
                <Link className="fila-pieza" to={`/admin/piezas/${venta.codigo}`}>
                  <span>
                    <span className="fila-pieza-ref">{venta.codigo}</span>
                    <span
                      className={
                        venta.nombrePieza
                          ? "fila-pieza-nombre"
                          : "fila-pieza-nombre fila-pieza-nombre-vacio"
                      }
                    >
                      {venta.nombrePieza ?? "Sin nombre todavía"}
                    </span>
                    <span className="fila-pieza-dias">
                      <span className="cifra">{fechaCortaDeBolivia(venta.vendidaEn)}</span> ·{" "}
                      {TEXTO_DEL_CANAL[venta.canal]}
                    </span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <span className="fila-pieza-precio">
                      Bs {bolivianos(venta.precioFinalCentavos)}
                    </span>
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BloquePanel>

      <BloquePanel
        titulo="Reservas vencidas"
        detalle={<MarcaVencidas cantidad={reservasVencidas.length} />}
      >
        {reservasVencidas.length === 0 ? (
          <p className="ayuda historial-vacio">Nunca dejó vencer una reserva.</p>
        ) : (
          <ul className="filas-pieza">
            {reservasVencidas.map((reserva, indice) => (
              <li key={`${reserva.codigo}-${indice}`}>
                <Link className="fila-pieza" to={`/admin/piezas/${reserva.codigo}`}>
                  <span>
                    <span className="fila-pieza-ref">{reserva.codigo}</span>
                    <span
                      className={
                        reserva.nombrePieza
                          ? "fila-pieza-nombre"
                          : "fila-pieza-nombre fila-pieza-nombre-vacio"
                      }
                    >
                      {reserva.nombrePieza ?? "Sin nombre todavía"}
                    </span>
                    <span className="fila-pieza-dias">
                      Venció el{" "}
                      <span className="cifra">
                        {fechaCortaDeBolivia(reserva.venceEn)} {horaDeBolivia(reserva.venceEn)}
                      </span>{" "}
                      · {TEXTO_DEL_ORIGEN[reserva.origen]}
                    </span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BloquePanel>
    </>
  );
}
