import { Icono } from "./icono";

/**
 * Cerrar sesión, para la derecha de la barra del panel: una etiqueta de papel
 * con texto en tinta (como la Ref.), porque el texto blanco pequeño no se lee
 * sobre el rosa. Envía `POST /salir` con un
 * formulario nativo, así funciona aunque el JavaScript no haya cargado.
 */
export function BotonSalir() {
  return (
    <form method="post" action="/salir" className="contents">
      <button type="submit" className="barra-panel-salir">
        <Icono nombre="salir" tamano={18} />
        Salir
      </button>
    </form>
  );
}
