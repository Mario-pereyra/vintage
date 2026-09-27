import { describe, expect, it } from "vitest";

import { crearAccesoAlPanel, OPERADORA_DE_PRUEBA } from "./acceso";

describe("acceso al panel", () => {
  it("permite a los correos de la lista, sin importar mayúsculas ni espacios", () => {
    const acceso = crearAccesoAlPanel({
      correosPermitidos: " Ingrid@Gmail.com , mario@gmail.com ",
    });

    expect(acceso.permite("ingrid@gmail.com")).toBe(true);
    expect(acceso.permite("MARIO@gmail.com ")).toBe(true);
  });

  it("rechaza un correo que no está en la lista", () => {
    const acceso = crearAccesoAlPanel({ correosPermitidos: "ingrid@gmail.com" });

    expect(acceso.permite("extrana@gmail.com")).toBe(false);
    expect(acceso.permite("")).toBe(false);
    expect(acceso.permite(null)).toBe(false);
  });

  it("sin lista configurada no entra nadie", () => {
    expect(crearAccesoAlPanel({ correosPermitidos: undefined }).permite("ingrid@gmail.com")).toBe(false);
    expect(crearAccesoAlPanel({ correosPermitidos: " , ," }).permite("")).toBe(false);
  });

  it("la operadora de prueba solo entra con el login de desarrollo activado", () => {
    const sinLogin = crearAccesoAlPanel({ correosPermitidos: "ingrid@gmail.com" });
    const conLogin = crearAccesoAlPanel({
      correosPermitidos: "ingrid@gmail.com",
      loginDeDesarrollo: "true",
    });

    expect(sinLogin.loginDeDesarrollo).toBe(false);
    expect(sinLogin.permite(OPERADORA_DE_PRUEBA.correo)).toBe(false);
    expect(conLogin.loginDeDesarrollo).toBe(true);
    expect(conLogin.permite(OPERADORA_DE_PRUEBA.correo)).toBe(true);
    expect(conLogin.permite("ingrid@gmail.com")).toBe(true);
  });

  it("el login de desarrollo se activa solo con un valor explícito", () => {
    for (const valor of [undefined, "", "false", "0", "no", "TRUE "]) {
      expect(crearAccesoAlPanel({ correosPermitidos: "", loginDeDesarrollo: valor }).loginDeDesarrollo).toBe(
        valor === "TRUE ",
      );
    }
    expect(crearAccesoAlPanel({ correosPermitidos: "", loginDeDesarrollo: "1" }).loginDeDesarrollo).toBe(true);
  });
});
