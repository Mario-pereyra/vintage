/**
 * El contador de reservas vencidas de una compradora, como marca pequeña de
 * trazo de tinta junto a su nombre ("2 vencidas"). Nada si no tiene ninguna.
 * Es un dato interno: nunca se publica.
 */
export function MarcaVencidas({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <span className="marca-vencidas">
      <span className="cifra">{cantidad}</span> {cantidad === 1 ? "vencida" : "vencidas"}
    </span>
  );
}
