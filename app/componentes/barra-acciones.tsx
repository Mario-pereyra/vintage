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
 * El contenido del panel deja 140px abajo para despejarla (`.panel-cuerpo`).
 */
export function BarraAccionesPanel({
  vistaPrevia,
  guardar,
  publicar,
  motivo,
}: {
  vistaPrevia?: Omit<Boton, "texto">;
  guardar: Boton;
  publicar: Boton;
  motivo?: string;
}) {
  const { texto: textoGuardar = "Guardar", ...botonGuardar } = guardar;
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
          vistaPrevia ? "acciones-fila" : "acciones-fila acciones-fila-sin-vista"
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
        <button type="submit" {...botonGuardar} className="btn">
          {textoGuardar}
        </button>
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
