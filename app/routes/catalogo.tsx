import { EstadoVacio } from "~/componentes/estado-vacio";
import { Pagina } from "~/componentes/pagina";
import { dominioContexto } from "~/servidor/contexto.server";

import type { Route } from "./+types/catalogo";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Vintage — carteras de segunda mano seleccionadas" },
    {
      name: "description",
      content:
        "Carteras de segunda mano seleccionadas en Santa Cruz de la Sierra. Piezas únicas, con fotos y medidas reales.",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const piezas = await context.get(dominioContexto).listarCatalogo();
  return { piezas };
}

export default function Catalogo({ loaderData }: Route.ComponentProps) {
  const { piezas } = loaderData;

  return (
    <Pagina titulo="Catálogo">
      {piezas.length === 0 ? (
        <EstadoVacio
          titulo="Pronto nuevas carteras"
          detalle="Estamos preparando el próximo drop. Vuelve pronto."
        />
      ) : null}
    </Pagina>
  );
}
