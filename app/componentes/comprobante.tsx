import type { ReactNode } from "react";

import { Icono } from "./icono";
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
 * Comprobante mini (148px, dientes de 5px): nombre, Ref., precio y su foto 1:1
 * entera. Con `sello` (por ejemplo, "Vendida" o "Reservada") lleva el sello
 * pequeño; sin él, ninguno. También arma la tarjeta del listado del catálogo,
 * donde suma el tamaño derivado del ancho.
 */
export function ComprobanteMini({
  href,
  codigo,
  nombre,
  precio,
  tamano,
  foto,
  sello,
}: {
  href: string;
  codigo: string;
  nombre: string;
  precio: number;
  /** Tamaño derivado del ancho ("Mediana"), si corresponde mostrarlo. */
  tamano?: string;
  /**
   * La foto de frente, entera sobre rosa claro. Sin ella, el hueco muestra la
   * cámara y "Fotos en camino" (la variante "catálogo" llega con el #5).
   */
  foto?: { src: string; alt: string } | null;
  sello?: string;
}) {
  return (
    <a className="comprobante comprobante-mini" href={href}>
      <div className={foto ? "mini-foto" : "mini-foto mini-foto-vacia"}>
        {foto ? (
          <img src={foto.src} alt={foto.alt} loading="lazy" decoding="async" />
        ) : (
          <>
            <Icono nombre="camara" tamano={24} />
            <span>Fotos en camino</span>
          </>
        )}
      </div>
      {sello ? <Sello texto={sello} /> : null}
      <div className="mini-nombre">{nombre}</div>
      <div className="mini-ref">Ref. {codigo}</div>
      <div className="mini-pie">
        <span className="mini-precio">{formatearPrecio(precio)}</span>
        {tamano ? <span className="mini-tamano">{tamano}</span> : null}
      </div>
    </a>
  );
}
