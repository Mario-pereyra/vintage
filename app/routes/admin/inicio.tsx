import { obtenerOperadora } from "~/servidor/contexto.server";

import type { Route } from "./+types/inicio";

export function loader({ context }: Route.LoaderArgs) {
  return { nombre: obtenerOperadora(context).nombre };
}

export default function InicioDelPanel({ loaderData }: Route.ComponentProps) {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold">Hola, {loaderData.nombre}</h1>
      <p>El panel todavía no tiene secciones. Aquí vas a cargar lotes, piezas y reservas.</p>
    </section>
  );
}
