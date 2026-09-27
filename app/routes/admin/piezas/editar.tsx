import { env } from "cloudflare:workers";
import { useState } from "react";
import { data, Link, useSearchParams } from "react-router";

import { Icono } from "~/componentes/icono";
import { Sello } from "~/componentes/sello";
import { TOMAS_REQUERIDAS } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import {
  leerFormularioDePieza,
  respuestaDeRechazo,
} from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/editar";
import { FormularioDePieza, TEXTO_DEL_ESTADO } from "./formulario-de-pieza";

export const handle = {
  titulo: "Editar pieza",
  volverA: "/admin/piezas",
} satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const [pieza, listas] = await Promise.all([
    dominio.piezaDelPanel(params.codigo),
    dominio.listas(),
  ]);
  if (!pieza) throw data(null, { status: 404 });
  const fotos = await dominio.fotosDePieza(params.codigo);
  return { pieza, listas, fotos, r2PublicUrl: env.R2_PUBLIC_URL };
}

/** Guarda los cambios y, si la operadora lo pidió, publica la pieza. */
export async function action({ params, request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  try {
    const { intencion, datos } = await leerFormularioDePieza(
      await request.formData(),
      dominio,
    );
    await dominio.editarPieza(params.codigo, datos);
    if (intencion === "publicar") {
      await dominio.publicarPieza(params.codigo);
      return { mensaje: "Publicada: ya está en el catálogo." };
    }
    return { mensaje: "Guardado." };
  } catch (error) {
    return respuestaDeRechazo(error);
  }
}

function fecha(valor: Date) {
  return valor.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  });
}

/** Lo que dice la pantalla al llegar desde "Cargar pieza" (`?nueva=`). */
const AL_LLEGAR: Record<string, string> = {
  guardada: "Pieza creada.",
  publicada: "Pieza creada y publicada: ya está en el catálogo.",
};

export default function EditarPieza({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { pieza, listas, fotos, r2PublicUrl } = loaderData;
  const [busqueda] = useSearchParams();
  const publicada = pieza.estado !== "en_preparacion";
  const alLlegar = AL_LLEGAR[busqueda.get("nueva") ?? ""];
  // Solo presentación (DESIGN.md, Sello): en preparación con las 8 tomas, el
  // sello del panel dice "Lista". El estado de la pieza no cambia.
  const [tomas, setTomas] = useState({ desde: fotos, cuantas: fotos.length });
  if (tomas.desde !== fotos) setTomas({ desde: fotos, cuantas: fotos.length });
  const lista = pieza.estado === "en_preparacion" && tomas.cuantas === TOMAS_REQUERIDAS.length;

  return (
    <>
      <div className="pieza-cabecera">
        <div>
          <p className="pieza-cabecera-ref">
            <span>Ref.</span>
            {pieza.codigo}
          </p>
          <p className="pieza-cabecera-detalle">
            {pieza.publicadaEn ? (
              <>
                Publicada el <span className="cifra">{fecha(pieza.publicadaEn)}</span>
              </>
            ) : (
              "La ficha pública se activa al publicar."
            )}
          </p>
          {publicada ? (
            <a
              className="enlace-ficha"
              href={pieza.rutaPublica}
              target="_blank"
              rel="noopener"
            >
              Ver ficha pública
              <Icono nombre="externo" />
            </a>
          ) : null}
          {publicada ? (
            <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}/reserva`}>
              Reserva e interesadas
              <Icono nombre="adelante" />
            </Link>
          ) : null}
        </div>
        <Sello texto={lista ? "Lista" : TEXTO_DEL_ESTADO[pieza.estado]} />
      </div>

      {/* La key reinicia el formulario cuando cambia la pieza guardada. */}
      <FormularioDePieza
        key={`${pieza.codigo}-${pieza.estado}`}
        pieza={pieza}
        listas={listas}
        fotos={fotos}
        r2PublicUrl={r2PublicUrl}
        onTomasCambian={(cuantas) => setTomas({ desde: fotos, cuantas })}
        resultado={actionData ?? (alLlegar ? { mensaje: alLlegar } : undefined)}
      />
    </>
  );
}
