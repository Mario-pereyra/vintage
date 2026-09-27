import { useEffect, useRef } from "react";

/**
 * Sello de goma: el estado de una pieza impreso en tinta azul sobre el papel.
 * Al cambiar su texto se re-estampa (0.42s); con `prefers-reduced-motion`
 * no se anima (lo resuelve app.css).
 *
 * Ejemplos: <Sello texto="Revisada" detalle="limpia · cierres ok" />,
 * <Sello texto="Reservada" detalle="hasta las 16:40" />,
 * <Sello texto="Vendida" detalle="14/09 · Bs 180" />.
 */
export function Sello({
  texto,
  detalle,
  className,
}: {
  texto: string;
  detalle?: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const primeraVez = useRef(true);

  useEffect(() => {
    const sello = ref.current;
    if (!sello) return;
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    sello.classList.remove("sello-estampa");
    void sello.offsetWidth; // reinicia la animación
    sello.classList.add("sello-estampa");
  }, [texto, detalle]);

  return (
    <p
      ref={ref}
      className={className ? `sello ${className}` : "sello"}
      role="status"
    >
      {texto}
      {detalle ? <small>{detalle}</small> : null}
    </p>
  );
}
