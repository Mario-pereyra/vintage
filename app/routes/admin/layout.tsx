import { Outlet, redirect, useMatches } from "react-router";

import { AvisoSinConexion } from "~/componentes/aviso-sin-conexion";
import { BotonSalir } from "~/componentes/boton-salir";
import { PaginaPanel } from "~/componentes/pagina-panel";
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

/**
 * Lo que cada pantalla hija de `/admin` le pide a la barra del panel, con
 * `export const handle = { titulo: "…" } satisfies BarraDelPanel`. Sin
 * `volverA` es la portada: la barra abre con el wordmark.
 */
export type BarraDelPanel = { titulo: string; volverA?: string };

function useBarraDelPanel(): BarraDelPanel {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as Partial<BarraDelPanel> | undefined;
    if (handle?.titulo) return { titulo: handle.titulo, volverA: handle.volverA };
  }
  return { titulo: "Panel" };
}

export default function PanelLayout() {
  const { titulo, volverA } = useBarraDelPanel();

  return (
    <PaginaPanel
      titulo={titulo}
      volverA={volverA}
      acciones={<BotonSalir />}
      aviso={<AvisoSinConexion />}
    >
      <Outlet />
    </PaginaPanel>
  );
}
