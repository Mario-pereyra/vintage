import type { ChangeEvent } from "react";

/**
 * Interruptor "Mostrar" de un campo opcional: decide la visibilidad de ese
 * dato en la ficha. Va dentro de la etiqueta del campo (prop `mostrar` de
 * <Campo>). Encendido es tinta azul; apagado, tono línea.
 */
export function InterruptorMostrar({
  campo,
  name,
  checked,
  defaultChecked,
  alCambiar,
}: {
  /** Nombre del campo para lectores de pantalla: "Mostrar condición". */
  campo: string;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  alCambiar?: (visible: boolean) => void;
}) {
  return (
    <label className="mostrar">
      <input
        type="checkbox"
        role="switch"
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={
          alCambiar
            ? (evento: ChangeEvent<HTMLInputElement>) =>
                alCambiar(evento.target.checked)
            : undefined
        }
        aria-label={`Mostrar ${campo.toLowerCase()} en la ficha`}
      />
      <span aria-hidden="true">Mostrar</span>
    </label>
  );
}
