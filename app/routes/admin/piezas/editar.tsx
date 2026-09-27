import { env } from "cloudflare:workers";
import { useState } from "react";
import { data, Link, useSearchParams } from "react-router";

import { Icono } from "~/componentes/icono";
import { Sello } from "~/componentes/sello";
import { TEXTO_DE_CANAL, TOMAS_REQUERIDAS } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import {
  leerFormularioDePieza,
  respuestaDeRechazo,
} from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/editar";
import {
  FormularioDePieza,
  TEXTO_DEL_ESTADO,
  type ProcedenciaEnPanel,
} from "./formulario-de-pieza";

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

  // Procedencia (#8): un lote (con su proveedor) o una compra a particular.
  let procedencia: ProcedenciaEnPanel | null = null;
  if (pieza.loteId !== null) {
    const lote = await dominio.loteDelPanel(pieza.loteId);
    if (lote) {
      procedencia = {
        origen: "lote",
        loteId: lote.id,
        proveedorNombre: lote.proveedorNombre,
        canal: TEXTO_DE_CANAL[lote.canal],
        calidadDeclaradaNombre: lote.calidadDeclaradaNombre,
      };
    }
  } else if (pieza.proveedorId !== null) {
    const proveedor = await dominio.proveedorDelPanel(pieza.proveedorId);
    if (proveedor) {
      procedencia = {
        origen: "particular",
        proveedorNombre: proveedor.nombre,
        costoDirectoCentavos: pieza.costoDirectoCentavos ?? 0,
      };
    }
  }

  return { pieza, listas, fotos, r2PublicUrl: env.R2_PUBLIC_URL, procedencia };
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
  const { pieza, listas, fotos, r2PublicUrl, procedencia } = loaderData;
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
          {publicada ? (
            <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}/venta`}>
              Venta y entrega
              <Icono nombre="adelante" />
            </Link>
          ) : null}
          {publicada ? (
            <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}/precio`}>
              Precio publicado e historial
              <Icono nombre="adelante" />
            </Link>
          ) : null}
          {pieza.estado === "en_preparacion" || pieza.estado === "disponible" || pieza.estado === "retirada" ? (
            <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}/retiro`}>
              {pieza.estado === "retirada" ? "Retiro" : "Retirar pieza"}
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
        procedencia={procedencia}
      />
    </>
  );
}
