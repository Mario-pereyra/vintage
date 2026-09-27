import { data, Link } from "react-router";

import { Icono } from "~/componentes/icono";
import { Renglon } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { TEXTO_DE_CANAL } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerId } from "~/servidor/filtros-de-rentabilidad.server";

import type { BarraDelPanel } from "../layout";
import { fechaDeBolivia } from "../textos-de-venta";
import type { Route } from "./+types/lote";
import {
  BloqueDeCalidad,
  CabeceraDeRentabilidad,
  CifrasDeRentabilidadBloque,
  cuenta,
  Desglose,
  monto,
  TEXTO_DEL_ESTADO_DEL_LOTE,
} from "./cifras";

export const handle = {
  titulo: "Rentabilidad del lote",
  volverA: "/admin/rentabilidad",
} satisfies BarraDelPanel;

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `Rentabilidad del lote #${loaderData?.lote.id ?? ""} — Vintage Secret's` }];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const lote = await obtenerDominio(context).rentabilidadDeLote(leerId(params.id));
  if (!lote) throw data(null, { status: 404 });
  return { lote };
}

export default function RentabilidadDelLote({ loaderData }: Route.ComponentProps) {
  const { lote } = loaderData;

  return (
    <>
      <CabeceraDeRentabilidad
        antes="Lote"
        titulo={`#${lote.id}`}
        cifra
        detalle={
          <>
            <Link className="enlace-renglon" to={`/admin/rentabilidad/proveedores/${lote.proveedorId}`}>
              {lote.proveedorNombre}
            </Link>{" "}
            · {TEXTO_DE_CANAL[lote.canal]} · comprado{" "}
            <span className="cifra">{fechaDeBolivia(lote.fechaCompra)}</span>
          </>
        }
        sello={
          <Sello
            texto={TEXTO_DEL_ESTADO_DEL_LOTE[lote.estado]}
            detalle={
              lote.estado === "en_curso" ? `quedan ${cuenta(lote.sinVender, "pieza", "piezas")}` : undefined
            }
          />
        }
      />

      <CifrasDeRentabilidadBloque
        cifras={lote}
        porcentajeRecuperado={lote.porcentajeRecuperado}
        terminado={lote.estado === "terminado"}
        costos={
          <>
            <Renglon etiqueta="Costo + transporte" cifra>
              {monto(lote.costoLoteCentavos)}
            </Renglon>
            <Renglon etiqueta="Reacondicionamiento" cifra>
              {monto(lote.reacondicionamientoCentavos)}
            </Renglon>
            <Renglon etiqueta="Entregas" cifra>
              {monto(lote.entregasCentavos)}
            </Renglon>
          </>
        }
        pie={
          <Link className="enlace-ficha" to={`/admin/lotes/${lote.id}`}>
            Ver el lote y sus piezas
            <Icono nombre="adelante" />
          </Link>
        }
      />

      <BloqueDeCalidad calidadDeclarada={lote.calidadDeclaradaNombre} calidad={lote.calidadDetectada} />

      <Desglose porTipo={lote.porTipo} porCondicion={lote.porCondicion} />
    </>
  );
}
