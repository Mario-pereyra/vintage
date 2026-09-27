import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { betterAuth } from "better-auth/minimal";
import type { GoogleOptions } from "better-auth/social-providers";

import { OPERADORA_DE_PRUEBA, type AccesoAlPanel } from "~/dominio";
import type { PrismaClient } from "~/generated/prisma/client";

/** Una operadora con sesión abierta en el panel. */
export interface Operadora {
  nombre: string;
  correo: string;
}

export interface ConfiguracionDeAutenticacion {
  /** `BETTER_AUTH_SECRET`: firma las cookies de sesión. */
  secreto: string;
  /** URL pública de la app (`BETTER_AUTH_URL`); de ella sale el redirect de Google. */
  urlBase: string;
  google: {
    clientId: string;
    clientSecret: string;
    /** Solo en pruebas: reemplaza la verificación contra Google. */
    simulado?: Pick<GoogleOptions, "verifyIdToken" | "getUserInfo">;
  };
  /** Quién puede entrar al panel y si el login de desarrollo está activado. */
  acceso: AccesoAlPanel;
}

/** Código de error con que Better Auth vuelve a `/ingresar` si el correo no está permitido. */
export const CORREO_NO_PERMITIDO = "correo_no_permitido";

const MENSAJE_NO_PERMITIDO = "Este correo no tiene acceso al panel.";

/** Treinta días: las operadoras no deberían tener que entrar a cada rato. */
const DURACION_DE_SESION = 60 * 60 * 24 * 30;

/**
 * Plugin del login de desarrollo: `POST /api/auth/desarrollo/ingresar` abre
 * una sesión de la operadora de prueba sin pasar por Google. Con el login de
 * desarrollo apagado (producción) responde 404, igual que una ruta que no existe.
 */
function loginDeDesarrollo(acceso: AccesoAlPanel) {
  return {
    id: "vintage-login-de-desarrollo",
    endpoints: {
      ingresarComoOperadoraDePrueba: createAuthEndpoint(
        "/desarrollo/ingresar",
        { method: "POST" },
        async (ctx) => {
          if (!acceso.loginDeDesarrollo) throw new APIError("NOT_FOUND");

          const adaptador = ctx.context.internalAdapter;
          const existente = await adaptador.findUserByEmail(OPERADORA_DE_PRUEBA.correo);
          const user =
            existente?.user ??
            (await adaptador.createUser({
              name: OPERADORA_DE_PRUEBA.nombre,
              email: OPERADORA_DE_PRUEBA.correo,
              emailVerified: true,
            }, { method: "desarrollo" }));
          const session = await adaptador.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ ok: true });
        },
      ),
    },
  } as const;
}

export interface Autenticacion {
  /** `true` en local y en las vistas previas con `DEV_LOGIN` activado. */
  loginDeDesarrollo: boolean;
  /** Atiende `/api/auth/*` (regreso de Google, login de desarrollo). */
  handler(request: Request): Promise<Response>;
  /** La operadora de la sesión de esta request, o `null` si no hay o ya no tiene acceso. */
  operadoraDeLaSesion(headers: Headers): Promise<Operadora | null>;
  /**
   * Empieza el login con Google. Devuelve la URL de Google a la que hay que
   * redirigir y las cookies de estado que deben acompañar la redirección.
   */
  ingresarConGoogle(headers: Headers): Promise<{ url: string; headers: Headers }>;
  /**
   * Abre una sesión de la operadora de prueba. Devuelve los `Set-Cookie`.
   * Falla con 404 si el login de desarrollo está apagado.
   */
  ingresarComoOperadoraDePrueba(headers: Headers): Promise<Headers>;
  /** Cierra la sesión. Devuelve los `Set-Cookie` que la borran del navegador. */
  salir(headers: Headers): Promise<Headers>;
}

/**
 * Login de operadoras con Better Auth y Google.
 *
 * No hay registro público: la cuenta de una operadora se crea la primera vez
 * que entra con Google, y solo si su correo está en la lista permitida. La
 * lista se vuelve a revisar en cada request del panel, así que quitar un
 * correo de `ADMIN_EMAILS` corta el acceso aunque tenga una sesión abierta.
 */
export function crearAutenticacion(
  db: PrismaClient,
  { secreto, urlBase, google, acceso }: ConfiguracionDeAutenticacion,
): Autenticacion {
  const instancia = betterAuth({
    secret: secreto,
    baseURL: urlBase,
    database: prismaAdapter(db, { provider: "postgresql" }),
    socialProviders: {
      google: {
        clientId: google.clientId,
        clientSecret: google.clientSecret,
        prompt: "select_account",
        ...google.simulado,
      },
    },
    session: { expiresIn: DURACION_DE_SESION },
    // Sin telemetría de Better Auth.
    telemetry: { enabled: false },
    user: {
      // Se revisa al crear la cuenta y en cada regreso de Google, con el
      // correo que Google informa. Si no está en la lista, Better Auth vuelve
      // a /ingresar con `?error=correo_no_permitido`.
      validateUserInfo: ({ user }) =>
        acceso.permite(user.email)
          ? undefined
          : { error: CORREO_NO_PERMITIDO, errorDescription: MENSAJE_NO_PERMITIDO },
    },
    plugins: [loginDeDesarrollo(acceso)],
  });

  return {
    loginDeDesarrollo: acceso.loginDeDesarrollo,

    handler: (request: Request) => instancia.handler(request),

    async operadoraDeLaSesion(headers: Headers): Promise<Operadora | null> {
      const sesion = await instancia.api.getSession({ headers });
      if (!sesion || !acceso.permite(sesion.user.email)) return null;
      return { nombre: sesion.user.name, correo: sesion.user.email };
    },

    async ingresarConGoogle(headers: Headers) {
      const { headers: cookies, response } = await instancia.api.signInSocial({
        headers,
        body: {
          provider: "google",
          callbackURL: "/admin",
          errorCallbackURL: "/ingresar",
        },
        returnHeaders: true,
      });
      if (!response.url) throw new Error("Better Auth no devolvió la URL de Google.");
      return { url: response.url, headers: cookies };
    },

    async ingresarComoOperadoraDePrueba(headers: Headers): Promise<Headers> {
      const { headers: cookies } = await instancia.api.ingresarComoOperadoraDePrueba({
        headers,
        returnHeaders: true,
      });
      return cookies;
    },

    async salir(headers: Headers): Promise<Headers> {
      const { headers: cookies } = await instancia.api.signOut({
        headers,
        returnHeaders: true,
      });
      return cookies;
    },
  };
}
