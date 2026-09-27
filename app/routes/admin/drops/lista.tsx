import { Form, Link, redirect, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Icono } from "~/componentes/icono";
import type { DropDelPanel } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Drops", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { drops: await obtenerDominio(context).listarDrops() };
}

/** Crea un drop vacío y va directo a su detalle para asignarle piezas. */
export async function action({ context }: Route.ActionArgs) {
  const drop = await obtenerDominio(context).crearDrop();
  return redirect(`/admin/drops/${drop.id}`);
}

function FilaDeDrop({ drop }: { drop: DropDelPanel }) {
  return (
    <li>
      <Link className="fila-pieza" to={`/admin/drops/${drop.id}`}>
        <span>
          <span className="fila-pieza-ref">{drop.numero}</span>
          <span className="fila-pieza-nombre">
            {drop.piezasTotal === 0
              ? "Todavía sin piezas"
              : `${drop.piezasTotal} ${drop.piezasTotal === 1 ? "pieza" : "piezas"}`}
          </span>
        </span>
        <span className="fila-pieza-derecha">
          {drop.piezasListas > 0 ? (
            <span className="fila-lote-piezas">
              {drop.piezasListas} {drop.piezasListas === 1 ? "lista" : "listas"}
            </span>
          ) : null}
          <Icono nombre="adelante" />
        </span>
      </Link>
    </li>
  );
}

export default function ListaDeDrops({ loaderData }: Route.ComponentProps) {
  const { drops } = loaderData;
  const navegacion = useNavigation();
  const creando = navegacion.state === "submitting";

  return (
    <>
      <Form method="post">
        <button type="submit" className="btn btn-primario btn-ancho" disabled={creando}>
          <Icono nombre="mas" />
          {creando ? "Creando…" : "Crear drop"}
        </button>
      </Form>

      {drops.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay drops"
          detalle="Crea el primero para agrupar piezas y publicarlas juntas."
        />
      ) : (
        <BloquePanel titulo="Drops" detalle={`${drops.length}`} nuncaSePublica>
          <ul className="filas-pieza">
            {drops.map((drop) => (
              <FilaDeDrop key={drop.id} drop={drop} />
            ))}
          </ul>
        </BloquePanel>
      )}
    </>
  );
}
