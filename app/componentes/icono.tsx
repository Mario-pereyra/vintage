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
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
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
