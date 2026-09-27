import { Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Icono } from "~/componentes/icono";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { Route } from "./+types/entregas";
import type { BarraDelPanel } from "./layout";
import { bolivianos, fechaDeBolivia, TEXTO_DE_LA_MODALIDAD } from "./textos-de-venta";

export const handle = { titulo: "Entregas", volverA: "/admin" } satisfies BarraDelPanel;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Entregas — Vintage Secret's" }];
}

export async function loader({ context }: Route.LoaderArgs) {
  return { pendientes: await obtenerDominio(context).listarEntregasPendientes() };
}

/** La acción rápida de la lista: marcar entregada. */
export async function action({ request, context }: Route.ActionArgs) {
  const codigo = String((await request.formData()).get("codigo") ?? "");
  try {
    await obtenerDominio(context).marcarEntregada(codigo);
    return { mensaje: `${codigo}: entregada.` };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return { mensaje: error.message };
  }
}

export default function Entregas({ loaderData, actionData }: Route.ComponentProps) {
  const { pendientes } = loaderData;
  const navegacion = useNavigation();
  const marcando =
    navegacion.state !== "idle" ? navegacion.formData?.get("codigo")?.toString() : undefined;

  return (
    <>
      {actionData ? (
        <p className="panel-nota" role="status">
          {actionData.mensaje}
        </p>
      ) : null}

      <BloquePanel titulo="Pendientes" detalle={`${pendientes.length}`}>
        {pendientes.length === 0 ? (
          <p className="ayuda">No hay entregas pendientes.</p>
        ) : (
          <ol className="entregas">
            {pendientes.map((venta) => (
              <li key={venta.codigo} className="entrega">
                <Link to={`/admin/piezas/${venta.codigo}/venta`}>
                  <b className="cifra">{venta.codigo}</b> {venta.nombrePieza ?? ""}
                  <br />
                  {venta.compradora.nombre} · {TEXTO_DE_LA_MODALIDAD[venta.entrega.modalidad]}
                  {venta.entrega.costoCentavos > 0 ? (
                    <> · <span className="cifra">Bs {bolivianos(venta.entrega.costoCentavos)}</span></>
                  ) : null}
                  <br />
                  <span className="cifra">Vendida el {fechaDeBolivia(venta.vendidaEn)}</span>
                  {venta.entrega.guia ? <> · Guía {venta.entrega.guia}</> : null}
                  <Icono nombre="adelante" />
                </Link>
                <Form method="post">
                  <input type="hidden" name="codigo" value={venta.codigo} />
                  <button type="submit" className="btn" disabled={marcando === venta.codigo}>
                    Entregada
                  </button>
                </Form>
              </li>
            ))}
          </ol>
        )}
      </BloquePanel>
    </>
  );
}
