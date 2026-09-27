import { useId, type ReactNode } from "react";

import { Icono } from "./icono";

/**
 * Bloque de papel del panel (radio de 8px, 20 × 16px de padding) con su título
 * en Archivo 800 de 17px. `detalle` va a la derecha del título, en cifra
 * ("3 de 8 tomas"); con `completo`, en tinta azul.
 *
 * Con `nuncaSePublica`, lleva a la derecha la marca con candado. Es para las
 * pantallas enteras internas (proveedores, lotes, compras), donde el bloque no
 * es un agregado al final de un formulario que se publica.
 */
export function BloquePanel({
  titulo,
  detalle,
  completo = false,
  nuncaSePublica = false,
  children,
}: {
  titulo: ReactNode;
  detalle?: ReactNode;
  completo?: boolean;
  nuncaSePublica?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const detalleVisible = detalle ? (
    <span
      className={completo ? "bloque-detalle bloque-detalle-completo" : "bloque-detalle"}
    >
      {detalle}
    </span>
  ) : null;
  return (
    <section className="bloque" aria-labelledby={id}>
      <h2 id={id}>
        {nuncaSePublica && detalle ? (
          <span className="bloque-titulo-con-detalle">
            {titulo}
            {detalleVisible}
          </span>
        ) : (
          <>
            {titulo}
            {detalleVisible}
          </>
        )}
        {nuncaSePublica ? <MarcaNuncaSePublica /> : null}
      </h2>
      {children}
    </section>
  );
}

/** La marca con candado "Nunca se publica" (Archivo 600, 11px, mayúsculas). */
export function MarcaNuncaSePublica() {
  return (
    <span className="candado">
      <Icono nombre="candado" />
      Nunca se publica
    </span>
  );
}

/**
 * Bloque "Nunca se publica": datos internos (lote, condición de ingreso). Va
 * siempre al final del formulario.
 */
export function BloqueNuncaSePublica({
  titulo,
  children,
}: {
  titulo: ReactNode;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="bloque bloque-interno" aria-labelledby={id}>
      <h2 id={id}>
        {titulo}
        <MarcaNuncaSePublica />
      </h2>
      {children}
    </section>
  );
}
