import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Icono } from "./icono";

type Boton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  texto?: ReactNode;
};

/**
 * Barra de acciones fija del panel: vista previa (ojo, 52 × 52px), Guardar
 * (secundario) y Publicar (primario). Si Publicar está deshabilitado, hay que
 * decir por qué con `motivo` ("Faltan 2 tomas para publicar"): nunca se
 * deshabilita una acción sin explicarlo.
 *
 * Sin `guardar` ni `vistaPrevia` queda una sola acción a lo ancho (registrar
 * una venta, retirar una pieza).
 *
 * El contenido del panel deja 140px abajo para despejarla (`.panel-cuerpo`).
 */
export function BarraAccionesPanel({
  vistaPrevia,
  guardar,
  publicar,
  motivo,
}: {
  vistaPrevia?: Omit<Boton, "texto">;
  guardar?: Boton;
  publicar: Boton;
  motivo?: string;
}) {
  const { texto: textoPublicar = "Publicar", ...botonPublicar } = publicar;

  return (
    <div className="acciones">
      {motivo ? (
        <p className="acciones-motivo" id="motivo-publicar" aria-live="polite">
          {motivo}
        </p>
      ) : null}
      <div
        className={
          !guardar && !vistaPrevia
            ? "acciones-fila acciones-fila-una"
            : vistaPrevia
              ? "acciones-fila"
              : "acciones-fila acciones-fila-sin-vista"
        }
      >
        {vistaPrevia ? (
          <button
            type="button"
            aria-label="Ver cómo la verá la compradora"
            {...vistaPrevia}
            className="btn btn-icono"
          >
            <Icono nombre="ojo" />
          </button>
        ) : null}
        {guardar ? (
          <BotonGuardar {...guardar} />
        ) : null}
        <button
          type="submit"
          aria-describedby={motivo ? "motivo-publicar" : undefined}
          {...botonPublicar}
          className="btn btn-primario"
        >
          {textoPublicar}
        </button>
      </div>
    </div>
  );
}

function BotonGuardar({ texto = "Guardar", ...boton }: Boton) {
  return (
    <button type="submit" {...boton} className="btn">
      {texto}
    </button>
  );
}

/**
 * La línea de motivo a partir de lo que falta, con su artículo: ["el costo",
 * "la fecha de compra"] → "Faltan el costo y la fecha de compra"; con más de
 * tres, nombra los dos primeros y cuenta el resto. Sin faltantes,
 * `undefined` (la acción queda habilitada).
 */
export function motivoDeFaltantes(faltan: readonly string[]): string | undefined {
  if (faltan.length === 0) return undefined;
  if (faltan.length === 1) return `Falta ${faltan[0]}`;
  // Más de dos no entran en una línea a 390px: se nombran los primeros.
  if (faltan.length > 3) return `Faltan ${faltan[0]}, ${faltan[1]} y ${faltan.length - 2} datos más`;
  return `Faltan ${faltan.slice(0, -1).join(", ")} y ${faltan[faltan.length - 1]}`;
}

/**
 * La misma barra fija con una sola acción primaria, para las pantallas que no
 * publican nada (registrar un lote, abrirlo, registrar una compra). Si la
 * acción está deshabilitada, `motivo` dice qué falta, alineado a la derecha.
 */
export function BarraAccionUnica({
  texto,
  motivo,
  ...boton
}: Boton & { motivo?: string }) {
  return (
    <div className="acciones">
      {motivo ? (
        <p className="acciones-motivo" id="motivo-accion" aria-live="polite">
          {motivo}
        </p>
      ) : null}
      <div className="acciones-fila acciones-fila-unica">
        <button
          type="submit"
          aria-describedby={motivo ? "motivo-accion" : undefined}
          {...boton}
          className="btn btn-primario"
        >
          {texto}
        </button>
      </div>
    </div>
  );
}
