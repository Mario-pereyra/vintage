import type { ReactNode } from "react";

import { configuracionTienda } from "~/configuracion/tienda";

import { BarraPanel } from "./navegacion";

/**
 * Marco de las pantallas del panel: papel rosado (el rosa solo va en la barra
 * superior, que en la portada lleva el wordmark), columna de 640px y 140px
 * abajo para la barra de acciones fija.
 *
 * `aviso` va pegado debajo de la barra y queda fijo con ella al hacer scroll
 * (por ejemplo, <AvisoSinConexion />).
 */
export function PaginaPanel({
  titulo,
  inicio,
  volverA,
  codigo,
  acciones,
  aviso,
  children,
}: {
  titulo: string;
  /** Portada del panel, adonde lleva el wordmark (por defecto /admin). */
  inicio?: string;
  volverA?: string;
  codigo?: string;
  acciones?: ReactNode;
  aviso?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="campo-panel min-h-dvh">
      <div className="panel-cabecera">
        <BarraPanel
          marca={configuracionTienda.marca}
          inicio={inicio}
          titulo={titulo}
          volverA={volverA}
          codigo={codigo}
          acciones={acciones}
        />
        {aviso}
      </div>
      <main className="panel-cuerpo">{children}</main>
    </div>
  );
}
