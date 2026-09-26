import { createRequestHandler, RouterContextProvider } from "react-router";

import { crearDominio } from "~/dominio";
import { crearPrisma } from "~/servidor/base-de-datos.server";
import { dominioContexto } from "~/servidor/contexto.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const prisma = crearPrisma(env.DATABASE_URL);
    const contexto = new RouterContextProvider();
    contexto.set(dominioContexto, crearDominio(prisma));

    try {
      return await requestHandler(request, contexto);
    } finally {
      // Los loaders ya corrieron; cerramos la conexión sin demorar la respuesta.
      ctx.waitUntil(prisma.$disconnect());
    }
  },
} satisfies ExportedHandler<Env>;
