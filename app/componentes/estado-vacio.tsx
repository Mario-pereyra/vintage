/** Mensaje para cuando una lista no tiene nada que mostrar todavía. */
export function EstadoVacio({
  titulo,
  detalle,
}: {
  titulo: string;
  detalle?: string;
}) {
  return (
    <section className="flex flex-col items-center gap-2 py-24 text-center">
      <p className="text-xl font-medium">{titulo}</p>
      {detalle ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {detalle}
        </p>
      ) : null}
    </section>
  );
}
