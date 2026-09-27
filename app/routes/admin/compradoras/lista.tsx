import { Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { CampoTexto } from "~/componentes/campos";
import { Icono } from "~/componentes/icono";
import { MarcaVencidas } from "~/componentes/marca-vencidas";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Compradoras", volverA: "/admin" } satisfies BarraDelPanel;

/** Tope de la búsqueda del dominio: con tantas, conviene escribir más. */
const TOPE_DE_LA_BUSQUEDA = 20;

/** Tope del texto de búsqueda: de sobra para un nombre o un WhatsApp. */
const Q_MAXIMO = 80;

export async function loader({ request, context }: Route.LoaderArgs) {
  const qCrudo = new URL(request.url).searchParams.get("q");
  const q = qCrudo !== null ? qCrudo.trim().slice(0, Q_MAXIMO) : null;
  const encontradas = q !== null ? await obtenerDominio(context).buscarCompradoras(q) : null;
  return { q, encontradas };
}

export default function ListaDeCompradoras({ loaderData }: Route.ComponentProps) {
  const { q, encontradas } = loaderData;

  return (
    <BloquePanel
      titulo="Buscar compradora"
      detalle={encontradas ? `${encontradas.length}` : undefined}
    >
      <Form method="get" role="search" className="buscar-compradora">
        <label htmlFor="q" className="etiqueta">
          Nombre o WhatsApp
        </label>
        <div className="buscar-compradora-fila">
          <CampoTexto
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            autoComplete="off"
            enterKeyHint="search"
            placeholder="Ana o 70012345"
          />
          <button type="submit" className="btn btn-icono" aria-label="Buscar">
            <Icono nombre="buscar" />
          </button>
        </div>
      </Form>

      {encontradas ? (
        encontradas.length > 0 ? (
          <>
            <ul className="compradoras">
              {encontradas.map((c) => (
                <li key={c.id}>
                  <Link className="compradora-fila" to={`/admin/compradoras/${c.id}`}>
                    <span>
                      <b>{c.nombre}</b>
                      <span className="cifra">+{c.whatsapp}</span>
                    </span>
                    <span className="compradora-fila-derecha">
                      <MarcaVencidas cantidad={c.reservasVencidas} />
                      <Icono nombre="adelante" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {encontradas.length >= TOPE_DE_LA_BUSQUEDA ? (
              <p className="ayuda">
                Se muestran las primeras <span className="cifra">{TOPE_DE_LA_BUSQUEDA}</span>.
                Escribe más del nombre o del número para encontrarla.
              </p>
            ) : null}
          </>
        ) : (
          <p className="ayuda">
            Ninguna compradora coincide con «{q}».
          </p>
        )
      ) : (
        <p className="ayuda">
          Escribe parte del nombre o del número para ver sus compras y sus reservas vencidas.
        </p>
      )}
    </BloquePanel>
  );
}
