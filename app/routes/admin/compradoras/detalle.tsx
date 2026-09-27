import { data, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
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

/** "2 vencidas", en tinta de aviso; nada si no tiene ninguna. */
function Vencidas({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <span className="marca-vencidas">
      <span className="cifra">{cantidad}</span> {cantidad === 1 ? "vencida" : "vencidas"}
    </span>
  );
}

export default function DetalleDeCompradora({ loaderData }: Route.ComponentProps) {
  const { compradora, compras, reservasVencidas } = loaderData;

  return (
    <>
      <BloquePanel titulo={compradora.nombre} nuncaSePublica detalle={<Vencidas cantidad={compradora.reservasVencidas} />}>
        <Renglones>
          <Renglon etiqueta="WhatsApp" cifra>
            +{compradora.whatsapp}
          </Renglon>
          <Renglon etiqueta="Reservas vencidas" cifra>
            {compradora.reservasVencidas}
          </Renglon>
        </Renglones>
        <a className="btn btn-ancho" href={enlaceWhatsApp(compradora.whatsapp, `Hola ${compradora.nombre}.`)}>
          <Icono nombre="chat" />
          Escribirle
        </a>
      </BloquePanel>

      <BloquePanel titulo="Compras" detalle={`${compras.length}`}>
        {compras.length === 0 ? (
          <p className="ayuda">Todavía no le registraste ninguna venta.</p>
        ) : (
          <ul className="filas-pieza">
            {compras.map((venta) => (
              <li key={venta.codigo}>
                <Link className="fila-pieza" to={`/admin/piezas/${venta.codigo}`}>
                  <span>
                    <span className="fila-pieza-ref">{venta.codigo}</span>
                    <span className="fila-pieza-nombre">
                      {venta.nombrePieza ?? "Sin nombre todavía"}
                    </span>
                    <span className="ayuda">
                      {fechaCortaDeBolivia(venta.vendidaEn)} · {TEXTO_DEL_CANAL[venta.canal]}
                    </span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <span className="fila-pieza-precio">Bs {bolivianos(venta.precioFinalCentavos)}</span>
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BloquePanel>

      <BloquePanel titulo="Reservas vencidas" detalle={`${reservasVencidas.length}`}>
        {reservasVencidas.length === 0 ? (
          <p className="ayuda">Nunca dejó vencer una reserva.</p>
        ) : (
          <ul className="filas-pieza">
            {reservasVencidas.map((reserva, indice) => (
              <li key={`${reserva.codigo}-${indice}`}>
                <Link className="fila-pieza" to={`/admin/piezas/${reserva.codigo}`}>
                  <span>
                    <span className="fila-pieza-ref">{reserva.codigo}</span>
                    <span className="fila-pieza-nombre">
                      {reserva.nombrePieza ?? "Sin nombre todavía"}
                    </span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <span className="ayuda">Venció {fechaCortaDeBolivia(reserva.venceEn)}</span>
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
