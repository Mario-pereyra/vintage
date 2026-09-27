import { Link, redirect } from "react-router";

import { AvisoSinConexion } from "~/componentes/aviso-sin-conexion";
import { BloquePanel } from "~/componentes/bloque-panel";
import { PaginaPanel } from "~/componentes/pagina-panel";
import { Sello } from "~/componentes/sello";
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

/**
 * Mensaje para el `?error=` con que Better Auth vuelve después de Google. El
 * correo fuera de la lista lleva el sello "Sin acceso"; cualquier otro error
 * solo pide intentar de nuevo.
 */
function mensajeDeError(
  codigo: string | null,
): { sinAcceso: boolean; texto: string; ayuda: string } | null {
  if (!codigo) return null;
  if (codigo === CORREO_NO_PERMITIDO) {
    return {
      sinAcceso: true,
      texto: "Este correo no tiene acceso al panel.",
      ayuda:
        "Entra con la cuenta de Google autorizada o pide que agreguen tu correo a la lista de operadoras.",
    };
  }
  return {
    sinAcceso: false,
    texto: "No se pudo entrar con Google.",
    ayuda: "Intenta de nuevo. Si vuelve a pasar, revisa tu conexión.",
  };
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
    <PaginaPanel titulo="Ingresar" aviso={<AvisoSinConexion />}>
      <div className="ingreso">
        {error ? (
          <div role="alert" className="bloque ingreso-rechazo">
            {error.sinAcceso ? (
              <Sello texto="Sin acceso" detalle="correo no permitido" />
            ) : null}
            <div>
              <p>
                <strong>{error.texto}</strong>
              </p>
              <p>{error.ayuda}</p>
            </div>
          </div>
        ) : null}

        <BloquePanel titulo="Entrar al panel">
          <p className="ayuda">
            Solo para las operadoras de Vintage Secret's. Usa la cuenta de Google con
            la que te dieron acceso.
          </p>
          <form method="post">
            <button type="submit" className="btn btn-primario">
              Entrar con Google
            </button>
          </form>
        </BloquePanel>

        {loginDeDesarrollo ? (
          <p className="ingreso-pie">
            ¿Probando en local o en una vista previa?{" "}
            <Link to="/ingresar/desarrollo">Entrar como operadora de prueba</Link>
          </p>
        ) : null}
      </div>
    </PaginaPanel>
  );
}
