import type { ReactNode } from "react";

import { Sello } from "./sello";
import { formatearPrecio } from "./total";

/**
 * El comprobante de la pieza: papel blanco con borde troquelado arriba y
 * abajo. Lleva, en este orden: <EncabezadoComprobante>, <NombrePieza>, los
 * <Renglones>, los <Grupo> con sus renglones, el <Total> y el <PieComprobante>.
 * Es el mismo componente en la ficha y en la vista previa del panel.
 */
export function Comprobante({
  children,
  className,
  etiquetadoPor,
}: {
  children: ReactNode;
  className?: string;
  /** id del elemento que nombra al comprobante (normalmente la Ref.). */
  etiquetadoPor?: string;
}) {
  return (
    <article
      className={className ? `comprobante ${className}` : "comprobante"}
      aria-labelledby={etiquetadoPor}
    >
      {children}
    </article>
  );
}

/**
 * La Ref. como número de comprobante, con el sello a la derecha. Es el título
 * de la ficha (`<h1>`); en la vista previa se puede bajar de nivel con `como`.
 */
export function EncabezadoComprobante({
  codigo,
  id,
  sello,
  como: Titulo = "h1",
}: {
  /** Código de la pieza: "VT-0142". */
  codigo: string;
  id?: string;
  sello?: { texto: string; detalle?: string };
  como?: "h1" | "h2" | "p";
}) {
  return (
    <div className="comprobante-encabezado">
      <Titulo className="comprobante-ref" id={id}>
        <span>Ref.</span>
        {codigo}
      </Titulo>
      {sello ? <Sello texto={sello.texto} detalle={sello.detalle} /> : null}
    </div>
  );
}

/** El nombre de la pieza, debajo de la Ref. Deja lugar al sello a la derecha. */
export function NombrePieza({ children }: { children: ReactNode }) {
  return <p className="comprobante-nombre">{children}</p>;
}

/** Pie del comprobante en cifra: "Publicada 12/09 · DROP #03 · Una sola unidad". */
export function PieComprobante({ children }: { children: ReactNode }) {
  return <p className="comprobante-pie">{children}</p>;
}

/**
 * Comprobante mini (148px, dientes de 5px): una vendida reciente con su foto
 * 1:1 entera, nombre, Ref., precio y un sello "Vendida" pequeño.
 */
export function ComprobanteMini({
  href,
  codigo,
  nombre,
  precio,
  foto,
  sello = "Vendida",
}: {
  href: string;
  codigo: string;
  nombre: string;
  precio: number;
  /** URL de la foto de frente; se muestra entera sobre rosa claro. */
  foto?: { src: string; alt: string };
  sello?: string;
}) {
  return (
    <a className="comprobante comprobante-mini" href={href}>
      <div className="mini-foto">
        {foto ? <img src={foto.src} alt={foto.alt} loading="lazy" /> : null}
      </div>
      <Sello texto={sello} />
      <div className="mini-nombre">{nombre}</div>
      <div className="mini-ref">Ref. {codigo}</div>
      <div className="mini-precio">{formatearPrecio(precio)}</div>
    </a>
  );
}
