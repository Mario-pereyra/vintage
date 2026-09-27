import { redirect } from "react-router";

import { obtenerDominio } from "~/servidor/contexto.server";
import {
  leerFormularioDePieza,
  respuestaDeRechazo,
} from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/nueva";
import { FormularioDePieza } from "./formulario-de-pieza";

export const handle = {
  titulo: "Cargar pieza",
  volverA: "/admin/piezas",
} satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { listas: await obtenerDominio(context).listas() };
}

/**
 * Crea la pieza En preparación con lo que haya cargado la operadora. Si pidió
 * publicar y faltan datos, la pieza queda guardada y su pantalla dice qué
 * falta.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  try {
    const { intencion, datos } = await leerFormularioDePieza(
      await request.formData(),
      dominio,
    );
    const pieza = await dominio.crearPieza(datos);
    if (intencion === "publicar" && pieza.faltanParaPublicar.length === 0) {
      await dominio.publicarPieza(pieza.codigo);
    }
    return redirect(`/admin/piezas/${pieza.codigo}`);
  } catch (error) {
    return respuestaDeRechazo(error);
  }
}

export default function NuevaPieza({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  return (
    <FormularioDePieza
      pieza={null}
      listas={loaderData.listas}
      resultado={actionData}
    />
  );
}
