import { createRequestHandler, RouterContextProvider } from "react-router";

import { crearAccesoAlPanel, crearDominio, type Dominio } from "~/dominio";
import type { PrismaClient } from "~/generated/prisma/client";
import {
  crearAutenticacion,
  type Autenticacion,
} from "~/servidor/autenticacion.server";
import { crearPrisma } from "~/servidor/base-de-datos.server";
import {
  autenticacionContexto,
  dominioContexto,
} from "~/servidor/contexto.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

/**
 * Configuración del login de operadoras a partir del entorno del Worker.
 *
 * Con el login de desarrollo activado (local y vistas previas) la URL base es
 * la de la propia request, para que funcione en cualquier puerto y en cada URL
 * de preview. En producción es siempre `BETTER_AUTH_URL`.
 */
function configurarAutenticacion(env: Env, request: Request) {
  if (!env.BETTER_AUTH_SECRET) {
    throw new Error(
      "Falta BETTER_AUTH_SECRET. En local va en .env (ver .env.example); en Cloudflare es un secreto del Worker.",
    );
  }
  const acceso = crearAccesoAlPanel({
    correosPermitidos: env.ADMIN_EMAILS,
    loginDeDesarrollo: env.DEV_LOGIN,
  });
  return {
    secreto: env.BETTER_AUTH_SECRET,
    urlBase: acceso.loginDeDesarrollo
      ? new URL(request.url).origin
      : env.BETTER_AUTH_URL,
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
    },
    acceso,
  };
}

export default {
  async fetch(request, env, ctx) {
    let prisma: PrismaClient | undefined;
    let dominio: Dominio | undefined;
    let autenticacion: Autenticacion | undefined;

    const obtenerPrisma = () => (prisma ??= crearPrisma(env.DATABASE_URL));

    const contexto = new RouterContextProvider();
    contexto.set(dominioContexto, () => {
      dominio ??= crearDominio(obtenerPrisma());
      return dominio;
    });
    contexto.set(autenticacionContexto, () => {
      autenticacion ??= crearAutenticacion(
        obtenerPrisma(),
        configurarAutenticacion(env, request),
      );
      return autenticacion;
    });

    try {
      return await requestHandler(request, contexto);
    } finally {
      // Los loaders ya corrieron; cerramos la conexión sin demorar la respuesta.
      if (prisma) ctx.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<Env>;
