import { useEffect } from "react";
import { useRevalidator } from "react-router";

import { horaDeBolivia, tiempoRestante } from "./hora";

/** A partir de cuántos minutos restantes una reserva se marca como urgente. */
export const MINUTOS_URGENTES = 5;

/**
 * El tiempo que le queda a una reserva: la cifra grande ("12 min") y, debajo,
 * la hora en que vence. Con 5 minutos o menos se rellena de tinta, para que
 * la operadora la vea de un vistazo durante un live (sin tintas nuevas: el
 * énfasis es el relleno, como el chip activo).
 */
export function TiempoRestante({
  minutos,
  venceEn,
  grande = false,
}: {
  minutos: number;
  venceEn: Date;
  grande?: boolean;
}) {
  const clases = [
    "restante",
    grande && "restante-grande",
    minutos <= MINUTOS_URGENTES && "restante-urgente",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <p className={clases}>
      <span className="restante-cifra">
        <span className="restante-quedan">quedan</span>
        {tiempoRestante(minutos)}
      </span>
      <span className="restante-hora">
        vence <span className="cifra">{horaDeBolivia(venceEn)}</span>
      </span>
    </p>
  );
}

/**
 * Vuelve a pedir los datos de la pantalla cada `segundos` mientras está a la
 * vista: los minutos restantes se calculan en el servidor, y durante un live
 * la operadora deja el celular abierto en la lista.
 */
export function useRefrescarCada(segundos: number, activo = true) {
  const { revalidate, state } = useRevalidator();

  useEffect(() => {
    if (!activo) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible" && state === "idle") void revalidate();
    }, segundos * 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [activo, revalidate, segundos, state]);
}
