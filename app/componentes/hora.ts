/** "16:40": la hora en Bolivia (la tienda está en Santa Cruz). */
export function horaDeBolivia(valor: Date): string {
  return valor.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/La_Paz",
  });
}

/** "12 min", "1 h 05 min": lo que falta para que venza una reserva. */
export function tiempoRestante(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `${horas} h ${String(resto).padStart(2, "0")} min` : `${horas} h`;
}
