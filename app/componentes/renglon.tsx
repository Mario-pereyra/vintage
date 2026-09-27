import type { ReactNode } from "react";

/** Lista de renglones del comprobante (un `<dl>`). */
export function Renglones({ children }: { children: ReactNode }) {
  return <dl className="renglones">{children}</dl>;
}

/**
 * Un renglón del comprobante: etiqueta a la izquierda en tinta suave y valor a
 * la derecha, separado del siguiente por una línea punteada.
 *
 * - `cifra`: el valor es un número (medida, fecha, conteo) y va en Martian Mono.
 * - `aclaracion`: texto de 12px debajo del valor ("alto × ancho × profundidad").
 * - `nota`: el valor es texto libre de hasta 30ch.
 * - `oculto`: en la vista previa del panel, dato cargado pero no publicado.
 */
export function Renglon({
  etiqueta,
  children,
  cifra = false,
  aclaracion,
  nota = false,
  oculto = false,
}: {
  etiqueta: ReactNode;
  children: ReactNode;
  cifra?: boolean;
  aclaracion?: ReactNode;
  nota?: boolean;
  oculto?: boolean;
}) {
  const clases = ["renglon", nota && "renglon-nota", oculto && "renglon-oculto"]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={clases}>
      <dt>{etiqueta}</dt>
      <dd className={cifra ? "cifra" : undefined}>
        {children}
        {aclaracion ? <small>{aclaracion}</small> : null}
      </dd>
    </div>
  );
}

/**
 * Encabezado de un grupo de renglones ("La pieza", "Revisión"), con regla de
 * tinta debajo. Es el título del grupo, no una etiqueta sobre otro título.
 */
export function Grupo({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <h2 className="grupo" id={id}>
      {children}
    </h2>
  );
}
