import { redirect } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Correo } from "~/componentes/correo";
import { PaginaPanel } from "~/componentes/pagina-panel";
import { Renglon, Renglones } from "~/componentes/renglon";
import { OPERADORA_DE_PRUEBA } from "~/dominio";
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
  return { operadora: OPERADORA_DE_PRUEBA };
}

export async function action({ request, context }: Route.ActionArgs) {
  const autenticacion = obtenerAutenticacion(context);
  exigirLoginDeDesarrollo(autenticacion.loginDeDesarrollo);

  const headers = await autenticacion.ingresarComoOperadoraDePrueba(request.headers);
  return redirect("/admin", { headers });
}

export default function IngresarDesarrollo({ loaderData }: Route.ComponentProps) {
  const { operadora } = loaderData;
  return (
    <PaginaPanel titulo="Login de desarrollo" volverA="/ingresar">
      <div className="ingreso">
        <BloquePanel titulo="Entrar sin Google">
          <p className="ayuda">
            Abre una sesión de prueba para recorrer el panel. Solo existe en local y en
            las vistas previas; en producción esta página no existe.
          </p>
          <Renglones>
            <Renglon etiqueta="Operadora">{operadora.nombre}</Renglon>
            <Renglon etiqueta="Correo">
              <Correo>{operadora.correo}</Correo>
            </Renglon>
          </Renglones>
          <form method="post" className="mt-s-5">
            <button type="submit" className="btn btn-primario">
              Entrar como operadora de prueba
            </button>
          </form>
        </BloquePanel>
      </div>
    </PaginaPanel>
  );
}
