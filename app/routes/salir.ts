import { redirect } from "react-router";

import { obtenerAutenticacion } from "~/servidor/contexto.server";

import type { Route } from "./+types/salir";

// `POST /salir` cierra la sesión de la operadora y vuelve a `/ingresar`.

export async function action({ request, context }: Route.ActionArgs) {
  const headers = await obtenerAutenticacion(context).salir(request.headers);
  return redirect("/ingresar", { headers });
}

export function loader() {
  return redirect("/ingresar");
}
