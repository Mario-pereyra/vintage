import { createRequestHandler, RouterContextProvider } from "react-router";

import { crearDominio, type Dominio } from "~/dominio";
import type { PrismaClient } from "~/generated/prisma/client";
import { crearPrisma } from "~/servidor/base-de-datos.server";
import { dominioContexto } from "~/servidor/contexto.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    let prisma: PrismaClient | undefined;
    let dominio: Dominio | undefined;

    const contexto = new RouterContextProvider();
    contexto.set(dominioContexto, () => {
      prisma ??= crearPrisma(env.DATABASE_URL);
      dominio ??= crearDominio(prisma);
      return dominio;
    });

    try {
      return await requestHandler(request, contexto);
    } finally {
      // Los loaders ya corrieron; cerramos la conexión sin demorar la respuesta.
      if (prisma) ctx.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<Env>;
