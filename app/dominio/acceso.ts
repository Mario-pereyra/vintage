/**
 * Quién puede entrar al panel `/admin`.
 *
 * Una operadora es cualquier persona cuyo correo está en la lista permitida
 * (`ADMIN_EMAILS`). No hay registro público ni roles. Con el login de
 * desarrollo activado (solo en local y en las vistas previas) también entra la
 * operadora de prueba, para que Playwright pueda recorrer el panel sin Google.
 */

/** La operadora con la que entra el login de desarrollo. */
export const OPERADORA_DE_PRUEBA = {
  nombre: "Operadora de prueba",
  correo: "operadora.prueba@vintage.test",
} as const;

export interface AccesoAlPanel {
  /** `true` si el login de desarrollo está activado. */
  loginDeDesarrollo: boolean;
  /** `true` si una persona con ese correo es operadora y puede entrar al panel. */
  permite(correo: string | null | undefined): boolean;
}

function normalizar(correo: string): string {
  return correo.trim().toLowerCase();
}

/**
 * Arma las reglas de acceso a partir de la configuración.
 *
 * @param correosPermitidos Correos separados por coma (`ADMIN_EMAILS`).
 * @param loginDeDesarrollo `"true"` o `"1"` activan el login de desarrollo
 *   (`DEV_LOGIN`). Cualquier otro valor, o ninguno, lo deja apagado.
 */
export function crearAccesoAlPanel({
  correosPermitidos,
  loginDeDesarrollo,
}: {
  correosPermitidos: string | undefined;
  loginDeDesarrollo?: string | undefined;
}): AccesoAlPanel {
  const conLoginDeDesarrollo = ["true", "1"].includes(
    normalizar(loginDeDesarrollo ?? ""),
  );

  const permitidos = new Set(
    (correosPermitidos ?? "").split(",").map(normalizar).filter(Boolean),
  );
  if (conLoginDeDesarrollo) permitidos.add(OPERADORA_DE_PRUEBA.correo);

  return {
    loginDeDesarrollo: conLoginDeDesarrollo,
    permite(correo) {
      return Boolean(correo) && permitidos.has(normalizar(correo ?? ""));
    },
  };
}
