import type { KeyboardEvent } from "react";

/**
 * Teclado de un grupo de selección única (chips y control segmentado), con el
 * patrón de radiogroup: las flechas mueven la selección y el foco; Tab entra y
 * sale del grupo por la opción elegida.
 */
export function teclasDeSeleccionUnica<T extends string>(
  valores: readonly T[],
  valorActual: T | null | undefined,
  elegir: (valor: T) => void,
) {
  return (evento: KeyboardEvent<HTMLElement>) => {
    const siguiente = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[
      evento.key
    ];
    if (!siguiente || valores.length === 0) return;
    evento.preventDefault();

    const actual = valorActual ? valores.indexOf(valorActual) : -1;
    const indice = (actual + siguiente + valores.length) % valores.length;
    elegir(valores[indice]);

    const opciones = evento.currentTarget.querySelectorAll<HTMLElement>(
      "[role=radio]",
    );
    opciones[indice]?.focus();
  };
}

/** tabIndex de una opción: solo la elegida (o la primera) entra con Tab. */
export function tabIndexDeOpcion<T>(
  valor: T,
  valorActual: T | null | undefined,
  indice: number,
) {
  if (valorActual == null) return indice === 0 ? 0 : -1;
  return valor === valorActual ? 0 : -1;
}
