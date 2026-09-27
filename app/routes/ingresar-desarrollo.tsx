import { redirect } from "react-router";

import { obtenerAutenticacion } from "~/servidor/contexto.server";

import type { Route } from "./+types/ingresar-desarrollo";

/**
 * Login de desarrollo: entra como la operadora de prueba sin Google, para que
 * Playwright pueda recorrer `/admin`. Solo existe con `DEV_LOGIN` activado
 * (local y vistas previas); en producción responde 404.
 */

function exigirLoginDeDesarrollo(loginDeDesarrollo: boolean) {
  if (!loginDeDesarrollo) {
    throw new Response("No encontrado", { status: 404 });
  }
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: "Login de desarrollo — Vintage Secret's" },
    { name: "robots", content: "noindex" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  exigirLoginDeDesarrollo(obtenerAutenticacion(context).loginDeDesarrollo);
  return null;
}

export async function action({ request, context }: Route.ActionArgs) {
  const autenticacion = obtenerAutenticacion(context);
  exigirLoginDeDesarrollo(autenticacion.loginDeDesarrollo);

  const headers = await autenticacion.ingresarComoOperadoraDePrueba(request.headers);
  return redirect("/admin", { headers });
}

export default function IngresarDesarrollo() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-bold">Login de desarrollo</h1>
      <p>
        Entra al panel como la operadora de prueba, sin Google. Solo está activo en
        local y en las vistas previas.
      </p>
      <form method="post">
        <button type="submit" className="w-full border border-current px-4 py-3 font-semibold">
          Entrar como operadora de prueba
        </button>
      </form>
    </main>
  );
}
