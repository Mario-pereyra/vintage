import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "~/generated/prisma/client";

/**
 * Cliente de Prisma para Neon desde Workers, con el adaptador serverless
 * (WebSocket). En Workers no se reutilizan conexiones entre requests: se crea
 * un cliente por request y se cierra al terminar.
 */
export function crearPrisma(databaseUrl: string | undefined): PrismaClient {
  if (!databaseUrl) {
    throw new Error(
      "Falta DATABASE_URL. En local va en .env (ver .env.example); en Cloudflare es un secreto del Worker.",
    );
  }
  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString: databaseUrl }),
  });
}
