import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Las rutas importan valores de `~/dominio` (textos, `ErrorDeDominio`…) en
 * código que también va al bundle del navegador. Si un módulo del dominio
 * importa un VALOR del cliente generado de Prisma, el cliente y su wasm
 * (`query_compiler_fast_bg.wasm?module`) entran a ese bundle y `npm run build`
 * falla. El dominio solo importa tipos de Prisma: el cliente llega por
 * parámetro (`crearDominio(db)`).
 */
describe("el dominio no importa valores del cliente de Prisma", () => {
  const carpeta = join(process.cwd(), "app", "dominio");
  const modulos = readdirSync(carpeta).filter(
    (nombre) => nombre.endsWith(".ts") && !nombre.endsWith(".test.ts"),
  );

  it.each(modulos)("%s", (nombre) => {
    const codigo = readFileSync(join(carpeta, nombre), "utf8");
    const importacionesConValor = [
      ...codigo.matchAll(/import\s+(?!type\b)[^;]*?from\s+["'][^"']*generated\/prisma[^"']*["']/g),
    ].map((m) => m[0]);

    expect(importacionesConValor).toEqual([]);
  });
});
