import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Correo } from "~/componentes/correo";
import { Icono } from "~/componentes/icono";
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
        <ul className="secciones">
          <li>
            <Link className="seccion" to="/admin/piezas">
              <span>
                <b>Piezas</b>
                <span>Cargar, editar y publicar</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
          <li>
            <Link className="seccion" to="/admin/reservas">
              <span>
                <b>Reservas</b>
                <span>Activas, por vencimiento</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
          <li className="seccion seccion-proxima">
            <span>Lotes y fotos aparecen aquí cuando estén listos.</span>
          </li>
        </ul>
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
