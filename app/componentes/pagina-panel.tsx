import type { ReactNode } from "react";

import { BarraPanel } from "./navegacion";

/**
 * Marco de las pantallas del panel: papel rosado (el rosa solo va en la barra
 * superior), columna de 640px y 140px abajo para la barra de acciones fija.
 */
export function PaginaPanel({
  titulo,
  volverA,
  codigo,
  acciones,
  children,
}: {
  titulo: string;
  volverA?: string;
  codigo?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="campo-panel min-h-dvh">
      <BarraPanel
        titulo={titulo}
        volverA={volverA}
        codigo={codigo}
        acciones={acciones}
      />
      <main className="panel-cuerpo">{children}</main>
    </div>
  );
}
