import { defineConfig } from "prisma/config";

// Prisma 7 no carga .env por su cuenta. Si existe, lo leemos; en CI las
// variables llegan por el entorno.
try {
  process.loadEnvFile();
} catch {
  // Sin .env: se usa el entorno tal cual.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // Las migraciones van contra la conexión directa de Neon (sin pooling).
  // `prisma generate` no la necesita, por eso puede faltar en CI.
  datasource: {
    url: process.env.DIRECT_URL ?? "",
  },
});
