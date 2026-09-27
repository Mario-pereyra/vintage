import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Correo } from "~/componentes/correo";
import { Renglon, Renglones } from "~/componentes/renglon";
import { obtenerOperadora } from "~/servidor/contexto.server";

import type { Route } from "./+types/inicio";
import type { BarraDelPanel } from "./layout";

export const handle = { titulo: "Inicio" } satisfies BarraDelPanel;

export function loader({ context }: Route.LoaderArgs) {
  const { nombre, correo } = obtenerOperadora(context);
  return { nombre, correo };
}

export default function InicioDelPanel({ loaderData }: Route.ComponentProps) {
  const { nombre, correo } = loaderData;

  return (
    <>
      <h2 className="saludo">Hola, {nombre}</h2>

      <BloquePanel titulo="Secciones">
        <p>
          <Link to="/admin/piezas">Piezas</Link>: cargar, editar y publicar.
        </p>
        <p className="ayuda">
          Lotes, fotos y reservas aparecen aquí cuando estén listos.
        </p>
      </BloquePanel>

      <BloquePanel titulo="Tu sesión">
        <Renglones>
          <Renglon etiqueta="Operadora">{nombre}</Renglon>
          <Renglon etiqueta="Correo">
            <Correo>{correo}</Correo>
          </Renglon>
        </Renglones>
      </BloquePanel>
    </>
  );
}
