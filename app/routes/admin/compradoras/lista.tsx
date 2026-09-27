import { Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { CampoTexto } from "~/componentes/campos";
import { Icono } from "~/componentes/icono";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Compradoras", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ request, context }: Route.LoaderArgs) {
  const q = new URL(request.url).searchParams.get("q");
  const encontradas = q !== null ? await obtenerDominio(context).buscarCompradoras(q) : null;
  return { q, encontradas };
}

/** "2 vencidas", en tinta de aviso; nada si no tiene ninguna. */
function Vencidas({ cantidad }: { cantidad: number }) {
  if (cantidad === 0) return null;
  return (
    <span className="marca-vencidas">
      <span className="cifra">{cantidad}</span> {cantidad === 1 ? "vencida" : "vencidas"}
    </span>
  );
}

export default function ListaDeCompradoras({ loaderData }: Route.ComponentProps) {
  const { q, encontradas } = loaderData;

  return (
    <BloquePanel titulo="Buscar compradora">
      <Form method="get" role="search" className="buscar-compradora">
        <label htmlFor="q" className="etiqueta">
          Buscar por nombre o WhatsApp
        </label>
        <div className="buscar-compradora-fila">
          <CampoTexto
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" className="btn btn-icono" aria-label="Buscar">
            <Icono nombre="buscar" />
          </button>
        </div>
      </Form>

      {encontradas ? (
        encontradas.length > 0 ? (
          <ul className="compradoras">
            {encontradas.map((c) => (
              <li key={c.id}>
                <Link className="compradora-fila" to={`/admin/compradoras/${c.id}`}>
                  <span>
                    <b>{c.nombre}</b>
                    <span className="cifra">+{c.whatsapp}</span>
                  </span>
                  <span className="compradora-fila-derecha">
                    <Vencidas cantidad={c.reservasVencidas} />
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ayuda">Ninguna compradora coincide con "{q}".</p>
        )
      ) : (
        <p className="ayuda">Escribe un nombre o un WhatsApp para buscar.</p>
      )}
    </BloquePanel>
  );
}
