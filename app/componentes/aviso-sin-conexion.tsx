import { useSyncExternalStore } from "react";

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
 * Aviso visible cuando se corta la conexión. El panel no guarda nada sin
 * conexión (no hay modo offline), así que la operadora tiene que saberlo antes
 * de cargar algo.
 */
export function AvisoSinConexion() {
  const enLinea = useEnLinea();
  if (enLinea) return null;

  return (
    <div role="alert" className="sticky top-0 z-10 bg-neutral-900 px-4 py-2 text-center text-sm text-white">
      <strong>Sin conexión.</strong> Lo que cargues ahora no se va a guardar. Espera a
      que vuelva la conexión.
    </div>
  );
}
