import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { BotonWhatsApp } from "~/componentes/boton-whatsapp";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Pagina } from "~/componentes/pagina";
import { tituloDePagina } from "~/configuracion/tienda";

import type { Route } from "./+types/root";
import "./app.css";

/** Archivo (palabras) y Martian Mono (cifras), ver DESIGN.md. */
export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;800&family=Martian+Mono:wght@400;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#e0457b" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let titulo = "Algo salió mal";
  let detalle = "Ocurrió un error inesperado. Intenta de nuevo en un momento.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    titulo = error.status === 404 ? "No encontramos esta página" : "Error";
    detalle =
      error.status === 404
        ? "Puede que el enlace esté mal escrito."
        : error.statusText || detalle;
  } else if (import.meta.env.DEV && error instanceof Error) {
    detalle = error.message;
    stack = error.stack;
  }

  return (
    <Pagina titulo={titulo}>
      <title>{tituloDePagina(titulo)}</title>
      <EstadoVacio
        titulo={titulo}
        detalle={detalle}
        accion={
          <BotonWhatsApp variante="secundario" href="/" texto="Ver el catálogo" />
        }
      >
        {stack ? (
          <pre className="cifra mt-s-4 overflow-x-auto text-xs text-tinta-2">
            <code>{stack}</code>
          </pre>
        ) : null}
      </EstadoVacio>
    </Pagina>
  );
}
