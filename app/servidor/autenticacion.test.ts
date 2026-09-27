import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { crearAccesoAlPanel, OPERADORA_DE_PRUEBA } from "~/dominio";
import type { PrismaClient } from "~/generated/prisma/client";

import { crearPrismaDePrueba } from "../dominio/pruebas/base-de-prueba";
import { crearAutenticacion } from "./autenticacion.server";

const URL_BASE = "http://localhost:5173";

function autenticacion(
  prisma: PrismaClient,
  { correosPermitidos = "ingrid@gmail.com", loginDeDesarrollo = "" } = {},
) {
  return crearAutenticacion(prisma, {
    secreto: "un-secreto-de-prueba-suficientemente-largo-123",
    urlBase: URL_BASE,
    google: { clientId: "id-de-prueba", clientSecret: "secreto-de-prueba" },
    acceso: crearAccesoAlPanel({ correosPermitidos, loginDeDesarrollo }),
  });
}

/** Convierte los `Set-Cookie` de una respuesta en el `Cookie` del navegador. */
function cookiesDe(respuesta: Headers): Headers {
  const cookies = respuesta
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .filter((cookie) => !cookie.endsWith("="));
  return new Headers({ cookie: cookies.join("; ") });
}

describe("autenticación de operadoras", () => {
  let prisma: PrismaClient;
  let cerrar: () => Promise<void>;

  beforeEach(async () => {
    ({ prisma, cerrar } = await crearPrismaDePrueba());
  });

  afterEach(async () => {
    await cerrar();
  });

  it("sin sesión no hay operadora", async () => {
    const auth = autenticacion(prisma);

    expect(await auth.operadoraDeLaSesion(new Headers())).toBeNull();
  });

  it("el login de desarrollo abre una sesión de la operadora de prueba", async () => {
    const auth = autenticacion(prisma, { loginDeDesarrollo: "true" });

    const respuesta = await auth.ingresarComoOperadoraDePrueba(new Headers());

    expect(await auth.operadoraDeLaSesion(cookiesDe(respuesta))).toEqual({
      nombre: OPERADORA_DE_PRUEBA.nombre,
      correo: OPERADORA_DE_PRUEBA.correo,
    });
  });

  it("el login de desarrollo se puede repetir con la misma operadora", async () => {
    const auth = autenticacion(prisma, { loginDeDesarrollo: "true" });

    await auth.ingresarComoOperadoraDePrueba(new Headers());
    const respuesta = await auth.ingresarComoOperadoraDePrueba(new Headers());

    expect(await auth.operadoraDeLaSesion(cookiesDe(respuesta))).not.toBeNull();
  });

  it("sin el login de desarrollo activado, su ruta responde 404", async () => {
    const auth = autenticacion(prisma);

    await expect(auth.ingresarComoOperadoraDePrueba(new Headers())).rejects.toMatchObject({
      statusCode: 404,
    });
    const respuesta = await auth.handler(
      new Request(`${URL_BASE}/api/auth/desarrollo/ingresar`, { method: "POST" }),
    );
    expect(respuesta.status).toBe(404);
  });

  it("cerrar sesión deja la sesión sin efecto", async () => {
    const auth = autenticacion(prisma, { loginDeDesarrollo: "true" });
    const cookies = cookiesDe(await auth.ingresarComoOperadoraDePrueba(new Headers()));

    await auth.salir(cookies);

    expect(await auth.operadoraDeLaSesion(cookies)).toBeNull();
  });

  it("una sesión de alguien que ya no está en la lista no da acceso", async () => {
    const conLogin = autenticacion(prisma, { loginDeDesarrollo: "true" });
    const cookies = cookiesDe(await conLogin.ingresarComoOperadoraDePrueba(new Headers()));

    const sinLogin = autenticacion(prisma);

    expect(await sinLogin.operadoraDeLaSesion(cookies)).toBeNull();
  });

  it("no crea cuentas para correos fuera de la lista (lo mismo que hace el regreso de Google)", async () => {
    // El regreso de Google crea la cuenta con el adaptador interno de Better
    // Auth, que corre los mismos hooks.
    const { internalAdapter } = await autenticacion(prisma).instancia.$context;
    const crear = (name: string, email: string) =>
      internalAdapter.createUser({ name, email, emailVerified: true });

    await expect(crear("Extraña", "extrana@gmail.com")).rejects.toMatchObject({
      body: { code: "correo_no_permitido" },
    });
    await expect(crear("Ingrid", "Ingrid@gmail.com")).resolves.toMatchObject({
      email: "ingrid@gmail.com",
    });
  });

  it("iniciar con Google devuelve la URL de Google y la cookie de estado", async () => {
    const auth = autenticacion(prisma);

    const { url, headers } = await auth.ingresarConGoogle(new Headers());

    expect(new URL(url).hostname).toBe("accounts.google.com");
    expect(new URL(url).searchParams.get("redirect_uri")).toBe(
      `${URL_BASE}/api/auth/callback/google`,
    );
    expect(headers.getSetCookie().length).toBeGreaterThan(0);
  });
});
