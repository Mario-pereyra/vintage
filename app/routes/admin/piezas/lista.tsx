import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { formatearPrecio } from "~/componentes/total";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";
import { TEXTO_DEL_ESTADO } from "./formulario-de-pieza";

export const handle = { titulo: "Piezas", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { piezas: await obtenerDominio(context).listarPiezasDelPanel() };
}

export default function ListaDePiezas({ loaderData }: Route.ComponentProps) {
  const { piezas } = loaderData;

  return (
    <>
      <p>
        <Link className="btn btn-primario" to="/admin/piezas/nueva">
          Cargar pieza
        </Link>
      </p>

      <BloquePanel titulo="Inventario" detalle={`${piezas.length}`}>
        {piezas.length === 0 ? (
          <p className="ayuda">Todavía no cargaste ninguna pieza.</p>
        ) : (
          <ul>
            {piezas.map((pieza) => (
              <li key={pieza.codigo}>
                <Link to={`/admin/piezas/${pieza.codigo}`}>
                  <span className="cifra">{pieza.codigo}</span>{" "}
                  {pieza.nombre ?? "Sin nombre"} · {TEXTO_DEL_ESTADO[pieza.estado]}
                  {pieza.precioCentavos !== null
                    ? ` · ${formatearPrecio(pieza.precioCentavos / 100)}`
                    : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BloquePanel>
    </>
  );
}
