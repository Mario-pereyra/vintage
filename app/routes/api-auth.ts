import { obtenerAutenticacion } from "~/servidor/contexto.server";

import type { Route } from "./+types/api-auth";

// `/api/auth/*`: lo atiende Better Auth (regreso de Google y login de desarrollo).

export function loader({ request, context }: Route.LoaderArgs) {
  return obtenerAutenticacion(context).handler(request);
}

export function action({ request, context }: Route.ActionArgs) {
  return obtenerAutenticacion(context).handler(request);
}
