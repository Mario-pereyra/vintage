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
    route("piezas/comprar", "routes/admin/piezas/comprar.tsx"),
    route("piezas/:codigo", "routes/admin/piezas/editar.tsx"),
    route("piezas/:codigo/reserva", "routes/admin/piezas/reserva.tsx"),
    route("piezas/:codigo/venta", "routes/admin/piezas/venta.tsx"),
    route("piezas/:codigo/retiro", "routes/admin/piezas/retiro.tsx"),
    // Precio publicado e historial de rebajas (#12).
    route("piezas/:codigo/precio", "routes/admin/piezas/precio.tsx"),
    route("reservas", "routes/admin/reservas.tsx"),
    route("compradoras", "routes/admin/compradoras/lista.tsx"),
    route("compradoras/:id", "routes/admin/compradoras/detalle.tsx"),
    // Subida y gestión de fotos de una pieza (R2 + dominio). Sin pantalla
    // propia: lo llama `TomasDelPanel` con `fetch`.
    route("piezas/:codigo/fotos", "routes/admin/piezas/fotos.ts"),
    route("proveedores", "routes/admin/proveedores/lista.tsx"),
    route("lotes", "routes/admin/lotes/lista.tsx"),
    route("lotes/nuevo", "routes/admin/lotes/nuevo.tsx"),
    route("lotes/:id", "routes/admin/lotes/detalle.tsx"),
    route("entregas", "routes/admin/entregas.tsx"),
    // Drops: agrupan piezas En preparación y las publican juntas o de a poco (#12).
    route("drops", "routes/admin/drops/lista.tsx"),
    route("drops/:id", "routes/admin/drops/detalle.tsx"),
    // Rentabilidad por lote y proveedor, y calidad detectada (interno).
    route("rentabilidad", "routes/admin/rentabilidad/lista.tsx"),
    route("rentabilidad/lotes/:id", "routes/admin/rentabilidad/lote.tsx"),
    route("rentabilidad/proveedores/:id", "routes/admin/rentabilidad/proveedor.tsx"),
  ]),
] satisfies RouteConfig;
