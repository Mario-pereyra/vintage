import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Icono } from "~/componentes/icono";
import { formatearPrecio } from "~/componentes/total";
import type { PiezaEnPanel } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Piezas", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { piezas: await obtenerDominio(context).listarPiezasDelPanel() };
}

const TITULO_DEL_GRUPO: Record<PiezaEnPanel["estado"], string> = {
  en_preparacion: "En preparación",
  disponible: "Disponibles",
  reservada: "Reservadas",
  vendida: "Vendidas",
  retirada: "Retiradas",
};

/** Una pieza del inventario: Ref., nombre y precio. El estado lo dice su grupo. */
function FilaDePieza({ pieza }: { pieza: PiezaEnPanel }) {
  return (
    <li>
      <Link className="fila-pieza" to={`/admin/piezas/${pieza.codigo}`}>
        <span>
          <span className="fila-pieza-ref">{pieza.codigo}</span>
          <span
            className={
              pieza.nombre
                ? "fila-pieza-nombre"
                : "fila-pieza-nombre fila-pieza-nombre-vacio"
            }
          >
            {pieza.nombre ?? "Sin nombre todavía"}
          </span>
        </span>
        <span className="fila-pieza-derecha">
          {pieza.precioCentavos !== null ? (
            <span className="fila-pieza-precio">
              {formatearPrecio(pieza.precioCentavos / 100)}
            </span>
          ) : (
            <span className="fila-pieza-precio-vacio">Sin precio</span>
          )}
          <Icono nombre="adelante" />
        </span>
      </Link>
    </li>
  );
}

function Filas({ piezas }: { piezas: readonly PiezaEnPanel[] }) {
  return (
    <ul className="filas-pieza">
      {piezas.map((pieza) => (
        <FilaDePieza key={pieza.codigo} pieza={pieza} />
      ))}
    </ul>
  );
}

export default function ListaDePiezas({ loaderData }: Route.ComponentProps) {
  const { piezas } = loaderData;
  const enPreparacion = piezas.filter((pieza) => pieza.estado === "en_preparacion");
  const publicadas = piezas.filter((pieza) => pieza.estado !== "en_preparacion");

  // Las publicadas se agrupan por estado, en el orden del ciclo de la pieza.
  const porEstado = (["disponible", "reservada", "vendida", "retirada"] as const)
    .map((estado) => [estado, publicadas.filter((pieza) => pieza.estado === estado)] as const)
    .filter(([, grupo]) => grupo.length > 0);

  return (
    <>
      <Link className="btn btn-primario btn-ancho" to="/admin/piezas/nueva">
        <Icono nombre="mas" />
        Cargar pieza
      </Link>

      {piezas.length === 0 ? (
        <BloquePanel titulo="Inventario" detalle="0 piezas">
          <p className="ayuda">
            Todavía no hay piezas. Cada una recibe su Ref. al guardarla por primera
            vez, aunque le falten datos: la completas y la publicas después.
          </p>
        </BloquePanel>
      ) : null}

      {enPreparacion.length > 0 ? (
        <BloquePanel
          titulo={TITULO_DEL_GRUPO.en_preparacion}
          detalle={`${enPreparacion.length}`}
        >
          <p className="ayuda">Guardadas, todavía no se ven en el catálogo.</p>
          <Filas piezas={enPreparacion} />
        </BloquePanel>
      ) : null}

      {porEstado.map(([estado, grupo]) => (
        <BloquePanel
          key={estado}
          titulo={TITULO_DEL_GRUPO[estado]}
          detalle={`${grupo.length}`}
        >
          <Filas piezas={grupo} />
        </BloquePanel>
      ))}
    </>
  );
}
