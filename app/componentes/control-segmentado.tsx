import { tabIndexDeOpcion, teclasDeSeleccionUnica } from "./seleccion-unica";

/**
 * Control segmentado para escalas fijas de 3 o 4 opciones: la Condición
 * (Excelente, Muy buena, Buena, Con detalles) y la autenticidad (Comprobada,
 * Atribuida, Sin marca). La opción elegida se rellena de tinta.
 */
export function ControlSegmentado<T extends string>({
  etiquetadoPor,
  opciones,
  valor,
  alCambiar,
  name,
}: {
  etiquetadoPor: string;
  opciones: readonly { valor: T; texto: string }[];
  valor: T | null;
  alCambiar: (valor: T) => void;
  name?: string;
}) {
  const valores = opciones.map((opcion) => opcion.valor);

  return (
    <>
      <div
        role="radiogroup"
        aria-labelledby={etiquetadoPor}
        className="segmento"
        onKeyDown={teclasDeSeleccionUnica(valores, valor, alCambiar)}
      >
        {opciones.map((opcion, indice) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={opcion.valor === valor}
            tabIndex={tabIndexDeOpcion(opcion.valor, valor, indice)}
            onClick={() => alCambiar(opcion.valor)}
          >
            {opcion.texto}
          </button>
        ))}
      </div>
      {name ? <input type="hidden" name={name} value={valor ?? ""} /> : null}
    </>
  );
}
