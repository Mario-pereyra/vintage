import { TOMAS } from "./galeria-tomas";

/**
 * Tomas del panel: grilla de 4 × 2 huecos 4:5 con el número en cifra y el
 * nombre de la toma. El hueco vacío lleva trazo discontinuo sobre papel
 * rosado. Por ahora solo muestra el orden: la carga de fotos se suma a este
 * mismo componente cuando exista.
 */
export function TomasDelPanel() {
  return (
    <ol className="tomas" aria-label="Orden de las 8 tomas">
      {TOMAS.map((toma, indice) => (
        <li key={toma} className="hueco">
          <span className="hueco-numero">{indice + 1}</span>
          <span className="hueco-nombre">{toma}</span>
        </li>
      ))}
    </ol>
  );
}
