import { data, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Renglon, Renglones } from "~/componentes/renglon";
import { TEXTO_DE_CANAL } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerId } from "~/servidor/filtros-de-rentabilidad.server";

import type { BarraDelPanel } from "../layout";
import { fechaDeBolivia } from "../textos-de-venta";
import type { Route } from "./+types/lote";
import {
  BloqueDeCalidad,
  Desglose,
  monto,
  RenglonesDeCifras,
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
      <BloquePanel
        titulo={`Lote #${lote.id}`}
        detalle={TEXTO_DEL_ESTADO_DEL_LOTE[lote.estado]}
        completo={lote.estado === "terminado"}
        nuncaSePublica
      >
        <Renglones>
          <Renglon etiqueta="Proveedor">
            <Link to={`/admin/rentabilidad/proveedores/${lote.proveedorId}`}>
              {lote.proveedorNombre}
            </Link>
          </Renglon>
          <Renglon etiqueta="Canal">{TEXTO_DE_CANAL[lote.canal]}</Renglon>
          <Renglon etiqueta="Comprado" cifra>
            {fechaDeBolivia(lote.fechaCompra)}
          </Renglon>
          <Renglon etiqueta="Costo + transporte" cifra>
            {monto(lote.costoLoteCentavos)}
          </Renglon>
          <Renglon etiqueta="Reacondicionamiento" cifra>
            {monto(lote.reacondicionamientoCentavos)}
          </Renglon>
          <Renglon etiqueta="Entregas" cifra>
            {monto(lote.entregasCentavos)}
          </Renglon>
        </Renglones>
        <RenglonesDeCifras
          cifras={lote}
          porcentajeRecuperado={lote.porcentajeRecuperado}
          terminado={lote.estado === "terminado"}
        />
        <p className="ayuda">
          <Link to={`/admin/lotes/${lote.id}`}>Ver el lote y sus piezas</Link>
        </p>
      </BloquePanel>

      <BloqueDeCalidad calidadDeclarada={lote.calidadDeclaradaNombre} calidad={lote.calidadDetectada} />

      <Desglose porTipo={lote.porTipo} porCondicion={lote.porCondicion} />
    </>
  );
}
