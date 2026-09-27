import { Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Icono, type NombreIcono } from "~/componentes/icono";
import { ErrorDeDominio, type ModalidadDeLaEntrega } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { Route } from "./+types/entregas";
import type { BarraDelPanel } from "./layout";
import { bolivianos, fechaCortaDeBolivia, TEXTO_DE_LA_MODALIDAD } from "./textos-de-venta";

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
    return { mensaje: `${codigo}: entregada.`, error: false };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return { mensaje: error.message, error: true };
  }
}

const ICONO_DE_LA_MODALIDAD: Record<ModalidadDeLaEntrega, NombreIcono> = {
  retiro: "ubicacion",
  delivery_santa_cruz: "delivery",
  envio_departamento: "paquete",
};

export default function Entregas({ loaderData, actionData }: Route.ComponentProps) {
  const { pendientes } = loaderData;
  const navegacion = useNavigation();
  const marcando =
    navegacion.state !== "idle" ? navegacion.formData?.get("codigo")?.toString() : undefined;

  return (
    <>
      <p
        className={actionData && !actionData.error ? "panel-nota panel-nota-fuerte" : "panel-nota"}
        role="status"
      >
        {actionData
          ? actionData.mensaje
          : pendientes.length > 1
            ? "La venta más antigua primero."
            : ""}
      </p>

      <BloquePanel
        titulo="Pendientes"
        detalle={String(pendientes.length)}
        completo={pendientes.length === 0}
      >
        {pendientes.length === 0 ? (
          <p className="ayuda">
            No hay entregas pendientes. Cada venta que no se entregó en el momento aparece aquí
            hasta que la marques entregada.
          </p>
        ) : (
          <ol className="entregas">
            {pendientes.map((venta) => {
              const { entrega } = venta;
              const faltaGuia = entrega.modalidad === "envio_departamento" && !entrega.guia;
              return (
                <li key={venta.codigo} className="entrega">
                  <Link to={`/admin/piezas/${venta.codigo}/venta`} className="entrega-enlace">
                    <span className="entrega-cabeza">
                      <b className="cifra">{venta.codigo}</b>
                      <span className="cifra">{fechaCortaDeBolivia(venta.vendidaEn)}</span>
                    </span>
                    <span className="entrega-compradora">{venta.compradora.nombre}</span>
                    {venta.nombrePieza ? (
                      <span className="entrega-pieza">{venta.nombrePieza}</span>
                    ) : null}
                    <span className="entrega-modalidad">
                      <Icono nombre={ICONO_DE_LA_MODALIDAD[entrega.modalidad]} tamano={16} />
                      {TEXTO_DE_LA_MODALIDAD[entrega.modalidad]}
                      {entrega.costoCentavos > 0 ? (
                        <span className="cifra entrega-costo">
                          Bs {bolivianos(entrega.costoCentavos)}
                        </span>
                      ) : null}
                    </span>
                    {entrega.guia ? (
                      <span className="entrega-guia">
                        Guía <span className="cifra">{entrega.guia}</span>
                      </span>
                    ) : faltaGuia ? (
                      <span className="entrega-guia entrega-falta">Falta la guía</span>
                    ) : null}
                  </Link>
                  <Form method="post">
                    <input type="hidden" name="codigo" value={venta.codigo} />
                    <button
                      type="submit"
                      className="btn"
                      disabled={marcando === venta.codigo}
                      aria-label={`Marcar ${venta.codigo} entregada`}
                    >
                      Entregada
                    </button>
                  </Form>
                </li>
              );
            })}
          </ol>
        )}
      </BloquePanel>
    </>
  );
}
