import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/catalogo.tsx"),
  // Muestrario de componentes base; solo responde en desarrollo.
  route("sistema", "routes/sistema.tsx"),
] satisfies RouteConfig;
