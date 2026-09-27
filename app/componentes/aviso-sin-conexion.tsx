import { useSyncExternalStore } from "react";

import { Icono } from "./icono";

function suscribirse(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

/** `true` mientras el navegador tenga conexión. En el servidor se asume que sí. */
export function useEnLinea(): boolean {
  return useSyncExternalStore(
    suscribirse,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * Aviso visible cuando se corta la conexión: una franja de tinta pegada debajo
 * de la barra del panel (va en el `aviso` de <PaginaPanel>). El panel no
 * guarda nada sin conexión (no hay modo offline), así que la operadora tiene
 * que saberlo antes de cargar algo.
 *
 * `siempre` lo muestra aunque haya conexión (solo para el muestrario).
 */
export function AvisoSinConexion({ siempre = false }: { siempre?: boolean }) {
  const enLinea = useEnLinea();
  if (enLinea && !siempre) return null;

  return (
    <div role="alert" className="aviso-sin-conexion">
      <Icono nombre="sinConexion" />
      <p>
        <strong>Sin conexión.</strong> Lo que cargues ahora no se guarda. Espera a
        que vuelva para seguir.
      </p>
    </div>
  );
}
