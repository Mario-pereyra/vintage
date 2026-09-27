import { tabIndexDeOpcion, teclasDeSeleccionUnica } from "./seleccion-unica";

export interface OpcionChip<T extends string> {
  valor: T;
  texto: string;
  /** Color de muestra (chips de color): es un dato de la pieza, no una tinta. */
  muestra?: string;
}

/**
 * Chips de selección única: píldoras de 40px sobre papel; la elegida se
 * rellena de tinta. `alPedirOtro` agrega el chip "+ Otro" con trazo
 * discontinuo. Con `name`, el valor viaja en el formulario.
 */
export function Chips<T extends string>({
  etiquetadoPor,
  opciones,
  valor,
  alCambiar,
  alPedirOtro,
  textoOtro = "+ Otro",
  name,
}: {
  /** id de la etiqueta del campo. */
  etiquetadoPor: string;
  opciones: readonly OpcionChip<T>[];
  valor: T | null;
  alCambiar: (valor: T) => void;
  alPedirOtro?: () => void;
  textoOtro?: string;
  name?: string;
}) {
  const valores = opciones.map((opcion) => opcion.valor);

  return (
    <div className="chips">
      <div
        role="radiogroup"
        aria-labelledby={etiquetadoPor}
        className="contents"
        onKeyDown={teclasDeSeleccionUnica(valores, valor, alCambiar)}
      >
        {opciones.map((opcion, indice) => (
          <button
            key={opcion.valor}
            type="button"
            role="radio"
            aria-checked={opcion.valor === valor}
            tabIndex={tabIndexDeOpcion(opcion.valor, valor, indice)}
            className="chip"
            onClick={() => alCambiar(opcion.valor)}
          >
            {opcion.muestra ? (
              <i
                className="chip-muestra"
                style={{ background: opcion.muestra }}
                aria-hidden="true"
              />
            ) : null}
            {opcion.texto}
          </button>
        ))}
      </div>
      {alPedirOtro ? (
        <button type="button" className="chip chip-mas" onClick={alPedirOtro}>
          {textoOtro}
        </button>
      ) : null}
      {name ? <input type="hidden" name={name} value={valor ?? ""} /> : null}
    </div>
  );
}
