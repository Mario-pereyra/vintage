import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Icono } from "~/componentes/icono";
import { TEXTO_DE_CANAL, type LoteDelPanel } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Lotes", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { lotes: await obtenerDominio(context).listarLotes() };
}

/**
 * Un lote: su número, proveedor y canal. A la derecha, cuántas piezas dio o,
 * si todavía no se abrió, "Sin abrir" (el sello queda para el estado de una
 * pieza).
 */
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
          {lote.abierto ? (
            <span className="fila-lote-piezas">
              {lote.piezas} {lote.piezas === 1 ? "pieza" : "piezas"}
            </span>
          ) : (
            <span className="fila-lote-estado">Sin abrir</span>
          )}
          <Icono nombre="adelante" />
        </span>
      </Link>
    </li>
  );
}

export default function ListaDeLotes({ loaderData }: Route.ComponentProps) {
  const { lotes } = loaderData;
  const sinAbrir = lotes.filter((lote) => !lote.abierto);
  const abiertos = lotes.filter((lote) => lote.abierto);

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
        <>
          {sinAbrir.length > 0 ? (
            <BloquePanel titulo="Por abrir" detalle={`${sinAbrir.length}`} nuncaSePublica>
              <ul className="filas-pieza">
                {sinAbrir.map((lote) => (
                  <FilaDeLote key={lote.id} lote={lote} />
                ))}
              </ul>
            </BloquePanel>
          ) : null}
          {abiertos.length > 0 ? (
            <BloquePanel
              titulo="Abiertos"
              detalle={`${abiertos.length}`}
              nuncaSePublica={sinAbrir.length === 0}
            >
              <ul className="filas-pieza">
                {abiertos.map((lote) => (
                  <FilaDeLote key={lote.id} lote={lote} />
                ))}
              </ul>
            </BloquePanel>
          ) : null}
        </>
      )}
    </>
  );
}
