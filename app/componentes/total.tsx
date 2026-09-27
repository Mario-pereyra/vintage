/** Formatea un precio en bolivianos para el comprobante: "Bs 180". */
export function formatearPrecio(bolivianos: number) {
  return `Bs ${bolivianos.toLocaleString("es-BO", { maximumFractionDigits: 2 })}`;
}

/**
 * El TOTAL que cierra el comprobante: la palabra TOTAL y el precio en cifra
 * grande sobre una regla doble. Si hubo rebaja, el precio anterior va tachado
 * debajo.
 */
export function Total({
  precio,
  precioAnterior,
}: {
  precio: number;
  precioAnterior?: number;
}) {
  return (
    <div className="total">
      <b>TOTAL</b>
      <div>
        <strong className="cifra">{formatearPrecio(precio)}</strong>
        {precioAnterior !== undefined ? (
          <del>
            <span className="sr-only">Antes </span>
            {formatearPrecio(precioAnterior)}
          </del>
        ) : null}
      </div>
    </div>
  );
}
