/**
 * Un correo que, si no entra en el renglón, se corta después de la arroba
 * ("operadora.prueba@" / "vintage.test") y no en medio del dominio.
 */
export function Correo({ children }: { children: string }) {
  const arroba = children.lastIndexOf("@");
  if (arroba < 0) return <span className="correo">{children}</span>;

  return (
    <span className="correo">
      {children.slice(0, arroba + 1)}
      <wbr />
      {children.slice(arroba + 1)}
    </span>
  );
}
