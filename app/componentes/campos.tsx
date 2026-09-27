import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import {
  rangoDeTamano,
  tamanoPorAncho,
  type UmbralesDeTamano,
} from "~/dominio/tamano";

/**
 * Un campo del panel: etiqueta (Archivo 600, 14px), el interruptor "Mostrar"
 * opcional a la derecha, una ayuda y el control.
 *
 * Para controles de selección (chips, segmentos), usa `idEtiqueta` y pásalo
 * como `etiquetadoPor`; para inputs, usa `para` con el id del input.
 */
export function Campo({
  etiqueta,
  para,
  idEtiqueta,
  mostrar,
  ayuda,
  children,
}: {
  etiqueta: ReactNode;
  para?: string;
  idEtiqueta?: string;
  /** <InterruptorMostrar> si el campo es opcional. */
  mostrar?: ReactNode;
  ayuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="campo">
      <div className="etiqueta">
        {para ? (
          <label htmlFor={para} id={idEtiqueta}>
            {etiqueta}
          </label>
        ) : (
          <span id={idEtiqueta}>{etiqueta}</span>
        )}
        {mostrar}
      </div>
      {ayuda ? <p className="ayuda">{ayuda}</p> : null}
      {children}
    </div>
  );
}

/** Campo de texto: papel, trazo de línea, radio de 4px; al enfocarse, trazo de tinta. */
export function CampoTexto(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" {...props} className="texto" />;
}

/** Área de texto con el mismo estilo que <CampoTexto>. */
export function AreaTexto(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className="texto" />;
}

/** Selección con la flecha de tinta dibujada en SVG. */
export function Seleccion(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="texto" />;
}

/**
 * Medida en cm: sin caja, la cifra de 24px sobre una línea de tinta de 2px y
 * teclado decimal. Van de a tres en <Medidas> (alto, ancho y profundidad).
 */
export function CampoMedida({
  etiqueta,
  ...input
}: { etiqueta: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "inputMode"
>) {
  return (
    <label className="medida">
      <span>{etiqueta}</span>
      <div>
        <input inputMode="decimal" placeholder="0" {...input} />
        <em>cm</em>
      </div>
    </label>
  );
}

/** Grilla de 3 medidas. */
export function Medidas({ children }: { children: ReactNode }) {
  return <div className="medidas">{children}</div>;
}

/**
 * El tamaño derivado del ancho, en tinta azul: "→ Mediana (de 25 a 32 cm de
 * ancho)". Los umbrales llegan de la configuración de la tienda.
 */
export function TamanoDerivado({
  ancho,
  umbrales,
}: {
  ancho: number | null | undefined;
  umbrales: UmbralesDeTamano;
}) {
  const tamano = ancho ? tamanoPorAncho(ancho, umbrales) : null;
  return (
    <p className="derivado" aria-live="polite">
      {tamano ? `→ ${tamano} (${rangoDeTamano(tamano, umbrales)})` : null}
    </p>
  );
}

/**
 * Lo tipeado en un monto ("150" o "150,50") en bolivianos, o `null` si todavía
 * no es un número. Solo sirve para mostrar cálculos mientras se escribe: las
 * reglas las aplica el dominio al guardar.
 */
export function leerMonto(texto: string): number | null {
  const limpio = texto.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(limpio) ? Number(limpio) : null;
}

/**
 * Cifra interna de 24px sobre una línea de tinta de 2px, sin caja: montos que
 * nunca se publican (costo de lote, transporte, costo directo,
 * reacondicionamiento) y conteos (unidades recibidas, descartes). La regla
 * doble queda reservada al precio publicado, el eco del TOTAL.
 *
 * `prefijo` va delante ("Bs") y `unidad` detrás ("u."), en cifra de 12–14px
 * tinta suave. Se etiqueta con <Campo para={id}>.
 */
export function CampoCifra({
  prefijo,
  unidad,
  inputMode = "decimal",
  ...input
}: {
  prefijo?: string;
  unidad?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className="campo-cifra">
      {prefijo ? <b aria-hidden="true">{prefijo}</b> : null}
      <input inputMode={inputMode} placeholder="0" {...input} />
      {unidad ? <em aria-hidden="true">{unidad}</em> : null}
    </div>
  );
}

/** Precio publicado: "Bs" en cifra de 22px y el valor en 40px sobre regla doble. */
export function CampoPrecio(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode">,
) {
  return (
    <label className="precio">
      <b aria-hidden="true">Bs</b>
      <input inputMode="numeric" placeholder="0" {...props} />
    </label>
  );
}
