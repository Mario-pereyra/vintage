import { useId, type ReactNode } from "react";

import { Icono } from "./icono";

/**
 * Bloque de papel del panel (radio de 8px, 20 × 16px de padding) con su título
 * en Archivo 800 de 17px. `detalle` va a la derecha del título, en cifra
 * ("3 de 8 tomas"); con `completo`, en tinta azul.
 */
export function BloquePanel({
  titulo,
  detalle,
  completo = false,
  children,
}: {
  titulo: ReactNode;
  detalle?: ReactNode;
  completo?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section className="bloque" aria-labelledby={id}>
      <h2 id={id}>
        {titulo}
        {detalle ? (
          <span
            className={
              completo ? "bloque-detalle bloque-detalle-completo" : "bloque-detalle"
            }
          >
            {detalle}
          </span>
        ) : null}
      </h2>
      {children}
    </section>
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
        <span className="candado">
          <Icono nombre="candado" />
          Nunca se publica
        </span>
      </h2>
      {children}
    </section>
  );
}
