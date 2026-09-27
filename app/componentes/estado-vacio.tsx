import type { ReactNode } from "react";

import { Comprobante } from "./comprobante";
import { Sello } from "./sello";

/**
 * Mensaje para cuando una lista no tiene nada que mostrar todavía: un
 * comprobante sobre el rosa con el título, un sello opcional, el detalle y,
 * si hace falta, renglones. `accion` va debajo, sobre el rosa.
 */
export function EstadoVacio({
  titulo,
  detalle,
  sello,
  children,
  accion,
}: {
  titulo: string;
  detalle?: ReactNode;
  sello?: { texto: string; detalle?: string };
  children?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <section className="vacio">
      <Comprobante>
        <div className="vacio-encabezado">
          <h2 className="vacio-titulo">{titulo}</h2>
          {sello ? <Sello texto={sello.texto} detalle={sello.detalle} /> : null}
        </div>
        {detalle ? <p className="vacio-detalle">{detalle}</p> : null}
        {children}
      </Comprobante>
      {accion ? <div className="vacio-accion">{accion}</div> : null}
    </section>
  );
}
