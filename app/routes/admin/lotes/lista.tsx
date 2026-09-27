import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Icono } from "~/componentes/icono";
import { Sello } from "~/componentes/sello";
import { TEXTO_DE_CANAL, type LoteDelPanel } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Lotes", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { lotes: await obtenerDominio(context).listarLotes() };
}

function FilaDeLote({ lote }: { lote: LoteDelPanel }) {
  return (
    <li>
      <Link className="fila-pieza" to={`/admin/lotes/${lote.id}`}>
        <span>
          <span className="fila-pieza-ref">Lote #{lote.id}</span>
          <span className="fila-pieza-nombre">
            {lote.proveedorNombre} · {TEXTO_DE_CANAL[lote.canal]}
          </span>
        </span>
        <span className="fila-pieza-derecha">
          <Sello texto={lote.abierto ? `${lote.piezas} piezas` : "Sin abrir"} />
          <Icono nombre="adelante" />
        </span>
      </Link>
    </li>
  );
}

export default function ListaDeLotes({ loaderData }: Route.ComponentProps) {
  const { lotes } = loaderData;

  return (
    <>
      <Link className="btn btn-primario btn-ancho" to="/admin/lotes/nuevo">
        <Icono nombre="mas" />
        Registrar lote
      </Link>

      {lotes.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay lotes"
          detalle="Registra el primero para poder abrirlo y cargar sus piezas."
        />
      ) : (
        <BloquePanel titulo="Lotes" detalle={`${lotes.length}`}>
          <ul className="filas-pieza">
            {lotes.map((lote) => (
              <FilaDeLote key={lote.id} lote={lote} />
            ))}
          </ul>
        </BloquePanel>
      )}
    </>
  );
}
