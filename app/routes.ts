import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/catalogo.tsx"),
  // Ficha pública: /carteras/<slug>-<sufijo> (ADR 0006).
  route("carteras/:direccion", "routes/ficha.tsx"),

  // Muestrario de componentes base; solo responde en desarrollo.
  route("sistema", "routes/sistema.tsx"),

  // Login de operadoras (Better Auth + Google).
  route("api/auth/*", "routes/api-auth.ts"),
  route("ingresar", "routes/ingresar.tsx"),
  route("ingresar/desarrollo", "routes/ingresar-desarrollo.tsx"),
  route("salir", "routes/salir.ts"),

  // Panel de operadoras. El layout exige sesión para todo lo que cuelga de aquí:
  // cada ruta nueva de /admin va como hija.
  route("admin", "routes/admin/layout.tsx", [
    index("routes/admin/inicio.tsx"),
    route("piezas", "routes/admin/piezas/lista.tsx"),
    route("piezas/nueva", "routes/admin/piezas/nueva.tsx"),
    route("piezas/:codigo", "routes/admin/piezas/editar.tsx"),
  ]),
] satisfies RouteConfig;
