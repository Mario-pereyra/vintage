import { Outlet, redirect } from "react-router";

import { AvisoSinConexion } from "~/componentes/aviso-sin-conexion";
import { enlacesDelPanel, metaDelPanel } from "~/pwa";
import {
  obtenerAutenticacion,
  obtenerOperadora,
  operadoraContexto,
} from "~/servidor/contexto.server";

import type { Route } from "./+types/layout";

/**
 * Exige una operadora con sesión antes de correr cualquier loader o action de
 * `/admin`. Sin sesión (o si su correo salió de la lista) vuelve a `/ingresar`.
 */
const exigirOperadora: Route.MiddlewareFunction = async ({ request, context }) => {
  const operadora = await obtenerAutenticacion(context).operadoraDeLaSesion(
    request.headers,
  );
  if (!operadora) throw redirect("/ingresar");
  context.set(operadoraContexto, operadora);
};

export const middleware: Route.MiddlewareFunction[] = [exigirOperadora];

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Panel — Vintage Secret's" },
    { name: "robots", content: "noindex" },
    ...metaDelPanel,
  ];
}

export const links: Route.LinksFunction = () => enlacesDelPanel;

/** El panel muestra costos y compradoras: nunca se guarda en cachés compartidas. */
export function headers() {
  return { "Cache-Control": "private, no-store" };
}

export function loader({ context }: Route.LoaderArgs) {
  return { operadora: obtenerOperadora(context) };
}

export default function PanelLayout({ loaderData }: Route.ComponentProps) {
  const { operadora } = loaderData;

  return (
    <div className="flex min-h-dvh flex-col">
      <AvisoSinConexion />
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
        <a href="/admin" className="font-semibold">
          Vintage Secret's · Panel
        </a>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{operadora.correo}</span>
          <form method="post" action="/salir">
            <button type="submit" className="underline">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
