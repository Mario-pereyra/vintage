import { useRef, useState, type ReactNode } from "react";

import { Icono } from "./icono";

/**
 * Las 8 tomas estandarizadas de cada pieza, en el orden en que se fotografían
 * (PRODUCT.md). La ficha las nombra en la tira; el panel, en sus huecos.
 */
export const TOMAS = [
  "Frente",
  "Dorso",
  "Lateral",
  "Base y esquinas",
  "Interior",
  "Herrajes y cierre",
  "Asas",
  "Puesta",
] as const;

export interface FotoDeToma {
  src: string;
  alt: string;
}

/**
 * Galería de la ficha: la tira de las 8 tomas nombradas sobre el rosa y el
 * carrusel con scroll-snap, sincronizados. Cada foto se muestra entera
 * (`object-fit: contain`) sobre rosa claro: 1:1 en celular y 4:5 en escritorio.
 *
 * Sin `fotos`, la tira queda como índice de lo que se fotografía y el marco
 * explica que las fotos todavía no están (`sinFotos`); nunca se muestra una
 * foto de muestra como si fuera la pieza.
 */
export function GaleriaDeTomas({
  fotos = [],
  sinFotos,
}: {
  /** Una por toma, en el orden de `TOMAS`. */
  fotos?: readonly FotoDeToma[];
  /** Lo que dice el marco mientras la pieza no tiene fotos. */
  sinFotos: ReactNode;
}) {
  const carril = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState(0);

  if (fotos.length === 0) {
    return (
      <section className="galeria" aria-label="Fotos de la pieza">
        <ol className="tira-tomas tira-tomas-indice" aria-label="Las 8 tomas de cada pieza">
          {TOMAS.map((toma, indice) => (
            <li key={toma}>
              <span className="cifra">{indice + 1}</span> {toma}
            </li>
          ))}
        </ol>
        <div className="toma toma-sin-foto">
          <Icono nombre="camara" tamano={28} />
          {sinFotos}
        </div>
      </section>
    );
  }

  const ir = (indice: number) => {
    const el = carril.current;
    if (!el) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: el.clientWidth * indice, behavior: reducir ? "auto" : "smooth" });
  };

  return (
    <section className="galeria" aria-label="Fotos de la pieza">
      <div className="tira-tomas" role="tablist" aria-label="Tomas">
        {fotos.map((_, indice) => (
          <button
            key={indice}
            type="button"
            role="tab"
            aria-selected={indice === activa}
            aria-controls={`toma-${indice}`}
            onClick={() => ir(indice)}
          >
            <span className="cifra">{indice + 1}</span> {TOMAS[indice] ?? "Toma"}
          </button>
        ))}
      </div>
      <div
        ref={carril}
        className="carril"
        tabIndex={0}
        aria-label={`Fotos: deslizá para ver las ${fotos.length} tomas`}
        onScroll={(evento) => {
          const el = evento.currentTarget;
          setActiva(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {fotos.map((foto, indice) => (
          <figure key={indice} className="toma" id={`toma-${indice}`}>
            <img
              src={foto.src}
              alt={foto.alt}
              loading={indice === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
