import { redirect } from "react-router";

import { CORREO_NO_PERMITIDO } from "~/servidor/autenticacion.server";
import { obtenerAutenticacion } from "~/servidor/contexto.server";

import type { Route } from "./+types/ingresar";
import { enlacesDelPanel, metaDelPanel } from "~/pwa";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Entrar al panel — Vintage Secret's" },
    { name: "robots", content: "noindex" },
    ...metaDelPanel,
  ];
}

export const links: Route.LinksFunction = () => enlacesDelPanel;

/** Mensaje para el `?error=` con que Better Auth vuelve después de Google. */
function mensajeDeError(codigo: string | null): string | null {
  if (!codigo) return null;
  if (codigo === CORREO_NO_PERMITIDO) {
    return "Este correo no tiene acceso al panel. Entra con una cuenta de Google autorizada o pide que agreguen tu correo a la lista.";
  }
  return "No se pudo entrar con Google. Intenta de nuevo.";
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const autenticacion = obtenerAutenticacion(context);
  if (await autenticacion.operadoraDeLaSesion(request.headers)) {
    throw redirect("/admin");
  }
  const error = new URL(request.url).searchParams.get("error");
  return {
    error: mensajeDeError(error),
    loginDeDesarrollo: autenticacion.loginDeDesarrollo,
  };
}

/** Empieza el login con Google: redirige a Google con la cookie de estado. */
export async function action({ request, context }: Route.ActionArgs) {
  const { url, headers } = await obtenerAutenticacion(context).ingresarConGoogle(
    request.headers,
  );
  return redirect(url, { headers });
}

export default function Ingresar({ loaderData }: Route.ComponentProps) {
  const { error, loginDeDesarrollo } = loaderData;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <header>
        <p className="text-sm font-semibold">Vintage Secret's</p>
        <h1 className="text-2xl font-bold">Panel de operadoras</h1>
      </header>

      {error ? (
        <p role="alert" className="border border-current p-3">
          {error}
        </p>
      ) : null}

      <form method="post">
        <button type="submit" className="w-full border border-current px-4 py-3 font-semibold">
          Entrar con Google
        </button>
      </form>

      {loginDeDesarrollo ? (
        <p className="text-sm">
          <a href="/ingresar/desarrollo" className="underline">
            Entrar como operadora de prueba (login de desarrollo)
          </a>
        </p>
      ) : null}
    </main>
  );
}
