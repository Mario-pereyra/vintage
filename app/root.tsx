import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import { Pagina } from "~/componentes/pagina";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
      <p className="text-xl font-medium">{titulo}</p>
      <p className="mt-2 text-neutral-600 dark:text-neutral-400">{detalle}</p>
      {stack ? (
        <pre className="mt-4 w-full overflow-x-auto p-4 text-xs">
          <code>{stack}</code>
        </pre>
      ) : null}
    </Pagina>
  );
}
