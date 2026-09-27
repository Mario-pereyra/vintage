/** "1 pieza", "12 piezas". */
export function contar(cuantas: number, singular: string, plural: string): string {
  return `${cuantas} ${cuantas === 1 ? singular : plural}`;
}

/** "27/09/2026", en la hora de Bolivia. */
export function fechaCorta(valor: Date): string {
  return valor.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  });
}
