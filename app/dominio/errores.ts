/** Por qué el dominio rechazó una operación. */
export type MotivoDeRechazo =
  /** Algún dato no es válido; `errores` dice cuál y por qué. */
  | "datos_invalidos"
  /** Faltan datos obligatorios para publicar; `errores` dice cuáles. */
  | "pieza_incompleta"
  /** La pieza no existe (o el código no se entiende). */
  | "pieza_no_encontrada"
  /** El lote no existe. */
  | "lote_no_encontrado"
  /** El estado actual de la pieza (o del lote) no admite esa operación. */
  | "transicion_no_permitida"
  /** La pieza no tiene una reserva activa (o ya venció). */
  | "reserva_no_encontrada"
  /** No existe la compradora elegida. */
  | "compradora_no_encontrada"
  /** La compradora tiene 2 reservas vencidas: debe pagar antes de reservar. */
  | "requiere_pago_previo"
  /** La compradora tiene 3 o más reservas vencidas: ya no se le reserva. */
  | "compradora_bloqueada";

/**
 * Una regla del negocio rechazó la operación. Los loaders y actions la
 * muestran a la operadora: `message` es la explicación general y `errores`,
 * si hay, el mensaje de cada campo.
 */
export class ErrorDeDominio extends Error {
  readonly motivo: MotivoDeRechazo;
  readonly errores: Readonly<Record<string, string>>;

  constructor(
    motivo: MotivoDeRechazo,
    mensaje: string,
    errores: Record<string, string> = {},
  ) {
    super(mensaje);
    this.name = "ErrorDeDominio";
    this.motivo = motivo;
    this.errores = errores;
  }
}
