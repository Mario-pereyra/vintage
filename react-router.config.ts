import type { Config } from "@react-router/dev/config";

export default {
  // El catálogo público se renderiza en el servidor (Open Graph, primera carga rápida).
  ssr: true,
} satisfies Config;
