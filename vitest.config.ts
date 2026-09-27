import { readFile } from "node:fs/promises";

import { defineConfig, type Plugin } from "vitest/config";

/**
 * El cliente de Prisma se genera para Workers (`runtime = "cloudflare"`) e
 * importa su compilador de consultas como `*.wasm?module`, igual que lo hace
 * workerd. En Node lo compilamos a mano para que las pruebas usen el mismo
 * cliente que producción.
 */
function wasmComoModulo(): Plugin {
  return {
    name: "vintage:wasm-como-modulo",
    enforce: "pre",
    async load(id) {
      if (!id.endsWith(".wasm?module")) return null;
      const ruta = id.slice(0, -"?module".length);
      const bytes = await readFile(ruta);
      return `export default new WebAssembly.Module(Uint8Array.from(atob(${JSON.stringify(
        bytes.toString("base64"),
      )}), (c) => c.charCodeAt(0)));`;
    },
  };
}

export default defineConfig({
  plugins: [wasmComoModulo()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    include: ["app/**/*.test.ts"],
    environment: "node",
    // El primer `beforeEach` de cada archivo migra la plantilla de PGlite; con
    // todos los archivos en paralelo puede pasar de los 10 s por defecto.
    hookTimeout: 60_000,
  },
});
