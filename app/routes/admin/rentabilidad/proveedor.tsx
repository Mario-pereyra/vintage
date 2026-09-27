import { data, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Renglon, Renglones } from "~/componentes/renglon";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFiltrosDeRentabilidad, leerId } from "~/servidor/filtros-de-rentabilidad.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/proveedor";
import {
  BloqueDeCalidad,
  Desglose,
  FiltroDeFechas,
  monto,
  porcentajeTexto,
  RenglonesDeCifras,
  TEXTO_DEL_ESTADO_DEL_LOTE,
} from "./cifras";

export const handle = {
  titulo: "Rentabilidad del proveedor",
  volverA: "/admin/rentabilidad",
} satisfies BarraDelPanel;

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.proveedor?.nombre ?? "Proveedor"} — Vintage Secret's` }];
}

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const { filtros, desde, hasta } = leerFiltrosDeRentabilidad(new URL(request.url));
  const dominio = obtenerDominio(context);
  const id = leerId(params.id);
  try {
    const proveedor = await dominio.rentabilidadDeProveedor(id, filtros);
    if (!proveedor) throw data(null, { status: 404 });
    return { proveedor, desde, hasta, errores: {} };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    // Fechas inválidas: la pantalla muestra el error y el agregado sin filtro.
    const proveedor = await dominio.rentabilidadDeProveedor(id);
    if (!proveedor) throw data(null, { status: 404 });
    return { proveedor, desde, hasta, errores: error.errores };
  }
}

export default function RentabilidadDelProveedor({ loaderData }: Route.ComponentProps) {
  const { proveedor, desde, hasta, errores } = loaderData;

  return (
    <>
      <FiltroDeFechas desde={desde} hasta={hasta} errores={errores} />

      <BloquePanel titulo={proveedor.nombre} nuncaSePublica>
        <Renglones>
          <Renglon etiqueta="Lotes" cifra>
            {proveedor.lotes}
          </Renglon>
          <Renglon etiqueta="Compras a particular" cifra>
            {proveedor.comprasAParticular}
          </Renglon>
        </Renglones>
        <RenglonesDeCifras cifras={proveedor} porcentajeRecuperado={proveedor.porcentajeRecuperado} />
      </BloquePanel>

      <BloqueDeCalidad calidad={proveedor.calidadDetectada} />

      {proveedor.calidadPorDeclarada.length > 0 ? (
        <BloquePanel titulo="Declarada frente a detectada" nuncaSePublica>
          <Renglones>
            {proveedor.calidadPorDeclarada.map((fila) => (
              <Renglon
                key={fila.calidadDeclaradaNombre}
                etiqueta={`${fila.calidadDeclaradaNombre} (${fila.lotes} ${fila.lotes === 1 ? "lote" : "lotes"})`}
                cifra
                aclaracion={`Exc. ${fila.calidadDetectada.condiciones.excelente} · Muy b. ${fila.calidadDetectada.condiciones.muy_buena} · Buena ${fila.calidadDetectada.condiciones.buena} · Con det. ${fila.calidadDetectada.condiciones.con_detalles}`}
              >
                {porcentajeTexto(fila.calidadDetectada.porcentajeDescarte)} descarte
              </Renglon>
            ))}
          </Renglones>
        </BloquePanel>
      ) : null}

      <Desglose porTipo={proveedor.porTipo} porCondicion={proveedor.porCondicion} />

      {proveedor.detalleDeLotes.length > 0 ? (
        <BloquePanel titulo="Sus lotes" detalle={String(proveedor.detalleDeLotes.length)}>
          <ul className="filas-pieza">
            {proveedor.detalleDeLotes.map((lote) => (
              <li key={lote.id}>
                <Link className="fila-pieza" to={`/admin/rentabilidad/lotes/${lote.id}`}>
                  <span>
                    <span className="fila-pieza-ref">Lote #{lote.id}</span>
                    <span className="fila-pieza-nombre">
                      {lote.calidadDeclaradaNombre} · {TEXTO_DEL_ESTADO_DEL_LOTE[lote.estado]}
                    </span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <span className="cifra">{monto(lote.margenCentavos)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </BloquePanel>
      ) : null}
    </>
  );
}
