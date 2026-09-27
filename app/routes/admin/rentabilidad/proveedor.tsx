import { data } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFiltrosDeRentabilidad, leerId } from "~/servidor/filtros-de-rentabilidad.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/proveedor";
import {
  BloqueDeCalidad,
  CabeceraDeRentabilidad,
  CifrasDeRentabilidadBloque,
  cuenta,
  Desglose,
  FilaDeRentabilidad,
  FiltroDeFechas,
  Partes,
  TEXTO_DEL_ESTADO_DEL_LOTE,
  valorDeLote,
} from "./cifras";

export const handle = {
  titulo: "Proveedor",
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
  const origen = [
    cuenta(proveedor.lotes, "lote", "lotes"),
    proveedor.comprasAParticular > 0
      ? cuenta(proveedor.comprasAParticular, "compra a particular", "compras a particular")
      : null,
  ]
    .filter((parte): parte is string => parte !== null);

  return (
    <>
      <CabeceraDeRentabilidad titulo={proveedor.nombre} detalle={<Partes partes={origen} />} />

      <FiltroDeFechas
        accion={`/admin/rentabilidad/proveedores/${proveedor.id}`}
        desde={desde}
        hasta={hasta}
        errores={errores}
      />

      <CifrasDeRentabilidadBloque
        cifras={proveedor}
        porcentajeRecuperado={proveedor.porcentajeRecuperado}
      />

      <BloqueDeCalidad
        calidad={proveedor.calidadDetectada}
        porDeclarada={proveedor.calidadPorDeclarada.map((fila) => ({
          nombre: fila.calidadDeclaradaNombre,
          lotes: fila.lotes,
          calidad: fila.calidadDetectada,
        }))}
      />

      <Desglose porTipo={proveedor.porTipo} porCondicion={proveedor.porCondicion} />

      {proveedor.detalleDeLotes.length > 0 ? (
        <BloquePanel titulo="Sus lotes" detalle={String(proveedor.detalleDeLotes.length)}>
          <ul className="filas-pieza">
            {proveedor.detalleDeLotes.map((lote) => {
              const { valor, que } = valorDeLote(lote);
              return (
                <FilaDeRentabilidad
                  key={lote.id}
                  to={`/admin/rentabilidad/lotes/${lote.id}`}
                  antes="Lote"
                  nombre={`#${lote.id}`}
                  nombreCifra
                  detalle={[lote.calidadDeclaradaNombre, TEXTO_DEL_ESTADO_DEL_LOTE[lote.estado]]}
                  valor={valor}
                  que={que}
                />
              );
            })}
          </ul>
        </BloquePanel>
      ) : null}
    </>
  );
}
