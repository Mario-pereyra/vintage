import { data } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Renglon, Renglones } from "~/componentes/renglon";
import { obtenerDominio } from "~/servidor/contexto.server";
import {
  leerFormularioDePieza,
  respuestaDeRechazo,
} from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/editar";
import { FormularioDePieza, TEXTO_DEL_ESTADO } from "./formulario-de-pieza";

export const handle = {
  titulo: "Pieza",
  volverA: "/admin/piezas",
} satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const [pieza, listas] = await Promise.all([
    dominio.piezaDelPanel(params.codigo),
    dominio.listas(),
  ]);
  if (!pieza) throw data(null, { status: 404 });
  return { pieza, listas };
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

export default function EditarPieza({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { pieza, listas } = loaderData;
  const publicada = pieza.estado !== "en_preparacion";

  return (
    <>
      <BloquePanel titulo={`Ref. ${pieza.codigo}`}>
        <Renglones>
          <Renglon etiqueta="Estado">{TEXTO_DEL_ESTADO[pieza.estado]}</Renglon>
          {pieza.publicadaEn ? (
            <Renglon etiqueta="Publicada" cifra>
              {fecha(pieza.publicadaEn)}
            </Renglon>
          ) : null}
          <Renglon etiqueta="Ficha pública">
            {publicada ? (
              <a href={pieza.rutaPublica} target="_blank" rel="noopener">
                {pieza.rutaPublica}
              </a>
            ) : (
              "Se activa al publicar"
            )}
          </Renglon>
        </Renglones>
      </BloquePanel>

      {/* La key reinicia el formulario cuando cambia la pieza guardada. */}
      <FormularioDePieza
        key={`${pieza.codigo}-${pieza.estado}`}
        pieza={pieza}
        listas={listas}
        resultado={actionData}
      />
    </>
  );
}
