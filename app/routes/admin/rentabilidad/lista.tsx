import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Icono } from "~/componentes/icono";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFiltrosDeRentabilidad } from "~/servidor/filtros-de-rentabilidad.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";
import {
  FiltroDeFechas,
  monto,
  porcentajeTexto,
  TEXTO_DEL_ESTADO_DEL_LOTE,
} from "./cifras";

export const handle = { titulo: "Rentabilidad", volverA: "/admin" } satisfies BarraDelPanel;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Rentabilidad — Vintage Secret's" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const { filtros, desde, hasta } = leerFiltrosDeRentabilidad(url);
  const dominio = obtenerDominio(context);
  try {
    const [proveedores, lotes] = await Promise.all([
      dominio.rentabilidadDeProveedores(filtros),
      dominio.rentabilidadDeLotes(filtros),
    ]);
    return { proveedores, lotes, desde, hasta, errores: {}, consulta: url.search };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return { proveedores: [], lotes: [], desde, hasta, errores: error.errores, consulta: "" };
  }
}

export default function Rentabilidad({ loaderData }: Route.ComponentProps) {
  const { proveedores, lotes, desde, hasta, errores, consulta } = loaderData;

  return (
    <>
      <p className="panel-nota">
        Lo que dejó cada proveedor y cada lote: ingresos por ventas contra costo, transporte,
        reacondicionamiento y entregas. Filtra por fecha de compra del lote.
      </p>

      <FiltroDeFechas desde={desde} hasta={hasta} errores={errores} />

      {proveedores.length === 0 && lotes.length === 0 ? (
        <EstadoVacio
          titulo="Nada que medir todavía"
          detalle="Registra un lote o una compra a particular para ver su rentabilidad."
        />
      ) : (
        <>
          <BloquePanel titulo="Proveedores" detalle={String(proveedores.length)} nuncaSePublica>
            <ul className="filas-pieza">
              {proveedores.map((proveedor) => (
                <li key={proveedor.id}>
                  <Link
                    className="fila-pieza"
                    to={`/admin/rentabilidad/proveedores/${proveedor.id}${consulta}`}
                  >
                    <span>
                      <span className="fila-pieza-ref">{proveedor.nombre}</span>
                      <span className="fila-pieza-nombre">
                        {proveedor.lotes} {proveedor.lotes === 1 ? "lote" : "lotes"} ·{" "}
                        {proveedor.vendidas} de {proveedor.piezas} vendidas
                      </span>
                    </span>
                    <span className="fila-pieza-derecha">
                      <span className="cifra">{monto(proveedor.margenCentavos)}</span>
                      <Icono nombre="adelante" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </BloquePanel>

          <BloquePanel titulo="Lotes" detalle={String(lotes.length)}>
            <ul className="filas-pieza">
              {lotes.map((lote) => (
                <li key={lote.id}>
                  <Link className="fila-pieza" to={`/admin/rentabilidad/lotes/${lote.id}`}>
                    <span>
                      <span className="fila-pieza-ref">Lote #{lote.id}</span>
                      <span className="fila-pieza-nombre">
                        {lote.proveedorNombre} · {TEXTO_DEL_ESTADO_DEL_LOTE[lote.estado]}
                      </span>
                    </span>
                    <span className="fila-pieza-derecha">
                      <span className="cifra">
                        {lote.estado === "terminado"
                          ? monto(lote.margenCentavos)
                          : porcentajeTexto(lote.porcentajeRecuperado)}
                      </span>
                      <Icono nombre="adelante" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </BloquePanel>
        </>
      )}
    </>
  );
}
