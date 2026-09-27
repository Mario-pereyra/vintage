import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * Una opción de filtro que es un enlace: cada toque cambia la URL, así el
 * listado filtrado se puede compartir y funciona sin JavaScript. La opción
 * activa lleva `aria-current` y se rellena de tinta, como el chip o el
 * segmento elegido.
 */
export interface OpcionDeFiltro {
  clave: string;
  texto: ReactNode;
  /** Adónde lleva el toque (normalmente, la misma URL con el filtro cambiado). */
  href: string;
  activo: boolean;
  /** Color de muestra (chips de color): es un dato de la pieza, no una tinta. */
  muestra?: string | null;
  /** Nombre accesible si `texto` no alcanza (por ejemplo, con cifras sueltas). */
  etiqueta?: string;
}

/** Un grupo de filtros con su título: "Tipo", "Color", "Tamaño"… */
export function GrupoDeFiltro({
  id,
  titulo,
  ayuda,
  children,
}: {
  id: string;
  titulo: string;
  ayuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="filtro" role="group" aria-labelledby={id}>
      <p className="filtro-titulo" id={id}>
        {titulo}
      </p>
      {children}
      {ayuda ? <p className="filtro-ayuda">{ayuda}</p> : null}
    </div>
  );
}

/**
 * Chips de filtro: píldoras de 40px que son enlaces. Con `carril`, van en una
 * sola fila que se desliza de costado (ahorra alto en el celular).
 */
export function ChipsDeFiltro({
  opciones,
  carril = false,
}: {
  opciones: readonly OpcionDeFiltro[];
  carril?: boolean;
}) {
  return (
    <ul className={carril ? "chips chips-carril" : "chips"}>
      {opciones.map((opcion) => (
        <li key={opcion.clave}>
          <Link
            className="chip"
            to={opcion.href}
            aria-current={opcion.activo ? "true" : undefined}
            aria-label={opcion.etiqueta}
            preventScrollReset
            replace
          >
            {opcion.muestra ? (
              <i
                className="chip-muestra"
                style={{ background: opcion.muestra }}
                aria-hidden="true"
              />
            ) : null}
            {opcion.texto}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Control segmentado de filtro (3 o 4 opciones iguales) hecho de enlaces. Tocar
 * la opción activa la quita.
 */
export function SegmentoDeFiltro({ opciones }: { opciones: readonly OpcionDeFiltro[] }) {
  return (
    <div className="segmento segmento-filtro">
      {opciones.map((opcion) => (
        <Link
          key={opcion.clave}
          to={opcion.href}
          aria-current={opcion.activo ? "true" : undefined}
          aria-label={opcion.etiqueta}
          preventScrollReset
          replace
        >
          {opcion.texto}
        </Link>
      ))}
    </div>
  );
}
