/**
 * Íconos del sistema: trazo de 2px, sin relleno, extremos redondeados y
 * siempre en `currentColor` (ver "Íconos" en DESIGN.md). El tamaño por defecto
 * es 20px; la búsqueda usa 16px y el candado 14px.
 */
const trazos = {
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  chat: <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12Z" />,
  volver: <path d="m15 18-6-6 6-6" />,
  ojo: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  galeria: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-5-5L5 21" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  delivery: (
    <>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
      <circle cx="7" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </>
  ),
  envio: (
    <>
      <path d="M4 8l8-4 8 4v8l-8 4-8-4Z" />
      <path d="M4 8l8 4 8-4M12 12v8" />
    </>
  ),
} as const;

export type NombreIcono = keyof typeof trazos;

export function Icono({
  nombre,
  tamano,
  className,
}: {
  nombre: NombreIcono;
  /** En px; por defecto 20. */
  tamano?: number;
  className?: string;
}) {
  return (
    <svg
      className={className ? `icono ${className}` : "icono"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={tamano ? { width: tamano, height: tamano } : undefined}
    >
      {trazos[nombre]}
    </svg>
  );
}
