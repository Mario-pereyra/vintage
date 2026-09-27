import { Form, Link, redirect, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Icono } from "~/componentes/icono";
import type { DropDelPanel } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";
import { contar, fechaCorta } from "./textos";

export const handle = { titulo: "Drops", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { drops: await obtenerDominio(context).listarDrops() };
}

/** Crea un drop vacío y va directo a su detalle para asignarle piezas. */
export async function action({ context }: Route.ActionArgs) {
  const drop = await obtenerDominio(context).crearDrop();
  return redirect(`/admin/drops/${drop.id}`);
}

/** La línea de avance de un drop: lo que la operadora decide al verlo. */
function avanceDe(drop: DropDelPanel): { texto: string; listo: boolean } {
  if (drop.piezasTotal === 0) return { texto: "Todavía sin piezas", listo: false };
  if (drop.piezasPublicadas === drop.piezasTotal) {
    return { texto: "Publicado completo", listo: false };
  }
  if (drop.piezasListas > 0) {
    return {
      texto:
        drop.piezasListas === 1 ? "1 lista para publicar" : `${drop.piezasListas} listas para publicar`,
      listo: true,
    };
  }
  if (drop.piezasPublicadas > 0) {
    return { texto: `${drop.piezasPublicadas} de ${drop.piezasTotal} publicadas`, listo: false };
  }
  const pendientes = drop.piezasTotal - drop.piezasPublicadas;
  return {
    texto: pendientes === 1 ? "A 1 pieza le falta algo" : `A ${pendientes} piezas les falta algo`,
    listo: false,
  };
}

function FilaDeDrop({ drop }: { drop: DropDelPanel }) {
  const avance = avanceDe(drop);
  return (
    <li>
      <Link className="fila-drop" to={`/admin/drops/${drop.id}`}>
        <span className="fila-drop-numero">{drop.numero}</span>
        <span className="fila-drop-cuantas">
          <strong>{drop.piezasTotal}</strong>
          {drop.piezasTotal === 1 ? "pieza" : "piezas"}
        </span>
        <Icono nombre="adelante" />
        <span className={avance.listo ? "fila-drop-avance fila-drop-avance-listo" : "fila-drop-avance"}>
          {avance.texto}
        </span>
        <span className="fila-drop-fecha"><span className="sr-only">Creado el </span>
          {fechaCorta(drop.creadoEn).slice(0, 5)}</span>
      </Link>
    </li>
  );
}

export default function ListaDeDrops({ loaderData }: Route.ComponentProps) {
  const { drops } = loaderData;
  const navegacion = useNavigation();
  const creando = navegacion.state === "submitting";

  const crear = (
    <Form method="post">
      <button type="submit" className="btn btn-primario btn-ancho" disabled={creando}>
        <Icono nombre="mas" />
        {creando ? "Creando…" : "Crear drop"}
      </button>
    </Form>
  );

  if (drops.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay drops"
        detalle={
          <>
            Un drop agrupa piezas En preparación bajo un número (
            <span className="cifra">DROP #01</span>) para promocionarlas en las redes y
            publicarlas juntas o de a poco.
          </>
        }
        accion={crear}
      />
    );
  }

  return (
    <>
      {crear}
      <BloquePanel titulo="Drops" detalle={contar(drops.length, "drop", "drops")}>
        <ul className="filas-drop">
          {drops.map((drop) => (
            <FilaDeDrop key={drop.id} drop={drop} />
          ))}
        </ul>
      </BloquePanel>
    </>
  );
}
