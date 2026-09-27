/**
 * Lo que hace instalable al panel como app (Android, Windows): el manifest y
 * los íconos de `public/`. No hay service worker: el panel no funciona sin
 * conexión (ADR 0005) y avisa cuando se corta.
 *
 * Se agregan al `<head>` de `/admin` y de `/ingresar`, que es donde se
 * instala el panel.
 */

/** Color de la barra de la app instalada (rosa de DESIGN.md). */
export const COLOR_DEL_PANEL = "#e0457b";

export const enlacesDelPanel = [
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", href: "/iconos/icono-192.png", type: "image/png", sizes: "192x192" },
  { rel: "apple-touch-icon", href: "/iconos/apple-touch-icon.png" },
];

export const metaDelPanel = [
  { name: "theme-color", content: COLOR_DEL_PANEL },
  { name: "mobile-web-app-capable", content: "yes" },
  { name: "apple-mobile-web-app-title", content: "Vintage" },
];
