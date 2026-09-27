import type { ReactNode } from "react";

import { configuracionTienda } from "~/configuracion/tienda";

import { BarraPublica, MigaDePan } from "./navegacion";

/**
 * Marco de las páginas públicas: el campo rosa, la barra con la marca y el
 * contenido en una columna de 1120px como máximo.
 */
export function Pagina({
  titulo,
  miga,
  busqueda,
  sinMargen = false,
  children,
}: {
  /** Título de la página para lectores de pantalla (el `<h1>`). */
  titulo: string;
  miga?: readonly { texto: string; href?: string }[];
  busqueda?: { accion: string; valor?: string };
  /**
   * Sin el margen lateral de la columna: la ficha lo maneja por su cuenta
   * (la foto va a 12px del borde y el comprobante a 20px).
   */
  sinMargen?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="campo-rosa min-h-dvh">
      <BarraPublica marca={configuracionTienda.marca} busqueda={busqueda} />
      {miga ? <MigaDePan pasos={miga} /> : null}
      <main className={sinMargen ? "pagina-publica pagina-sin-margen" : "pagina-publica"}>
        <h1 className="sr-only">{titulo}</h1>
        {children}
      </main>
    </div>
  );
}
