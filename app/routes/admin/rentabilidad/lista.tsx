import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { ErrorDeDominio } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFiltrosDeRentabilidad } from "~/servidor/filtros-de-rentabilidad.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";
import {
  cuenta,
  FilaDeRentabilidad,
  FiltroDeFechas,
  monto,
  TEXTO_DEL_ESTADO_DEL_LOTE,
  valorDeLote,
} from "./cifras";

export const handle = { titulo: "Rentabilidad", volverA: "/admin" } satisfies BarraDelPanel;

export function meta(_: Route.MetaArgs) {
  return [{ title: "Rentabilidad — Vintage Secret's" }];
}

/**
 * El filtro que se pasa al detalle del proveedor: solo `desde` y `hasta`, ya
 * validados, nunca el resto de la URL.
 */
function consultaDeFechas(desde: string, hasta: string): string {
  const parametros = new URLSearchParams();
  if (desde) parametros.set("desde", desde);
  if (hasta) parametros.set("hasta", hasta);
  const texto = parametros.toString();
  return texto ? `?${texto}` : "";
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
    return { proveedores, lotes, desde, hasta, errores: {}, consulta: consultaDeFechas(desde, hasta) };
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return { proveedores: [], lotes: [], desde, hasta, errores: error.errores, consulta: "" };
  }
}

/** ["1 lote", "1 compra a particular"], sin las partes en cero. */
function origenDelProveedor(lotes: number, comprasAParticular: number): string[] {
  const partes = [
    lotes > 0 || comprasAParticular === 0 ? cuenta(lotes, "lote", "lotes") : null,
    comprasAParticular > 0
      ? cuenta(comprasAParticular, "compra a particular", "compras a particular")
      : null,
  ];
  return partes.filter((parte): parte is string => parte !== null);
}

export default function Rentabilidad({ loaderData }: Route.ComponentProps) {
  const { proveedores, lotes, desde, hasta, errores, consulta } = loaderData;
  const conError = Object.keys(errores).length > 0;
  const filtrado = Boolean(desde || hasta);

  return (
    <>
      <p className="panel-nota">
        Lo que dejó cada proveedor y cada lote: ingresos por ventas contra costo, transporte,
        reacondicionamiento y entregas.
      </p>

      <FiltroDeFechas accion="/admin/rentabilidad" desde={desde} hasta={hasta} errores={errores} />

      {conError ? null : proveedores.length === 0 && lotes.length === 0 ? (
        filtrado ? (
          <EstadoVacio
            titulo="Nada comprado en esas fechas"
            detalle="Prueba con otro rango o quita el filtro para ver todo."
          />
        ) : (
          <EstadoVacio
            titulo="Nada que medir todavía"
            detalle="Registra un lote o una compra a particular para ver su rentabilidad."
          />
        )
      ) : (
        <>
          <BloquePanel titulo="Proveedores" detalle={String(proveedores.length)} nuncaSePublica>
            <ul className="filas-pieza">
              {proveedores.map((proveedor) => (
                <FilaDeRentabilidad
                  key={proveedor.id}
                  to={`/admin/rentabilidad/proveedores/${proveedor.id}${consulta}`}
                  nombre={proveedor.nombre}
                  detalle={[
                    ...origenDelProveedor(proveedor.lotes, proveedor.comprasAParticular),
                    `${proveedor.vendidas} de ${proveedor.piezas} vendidas`,
                  ]}
                  valor={monto(proveedor.margenCentavos)}
                  que="margen"
                />
              ))}
            </ul>
          </BloquePanel>

          {lotes.length > 0 ? (
            <BloquePanel titulo="Lotes" detalle={String(lotes.length)}>
              <ul className="filas-pieza">
                {lotes.map((lote) => {
                  const { valor, que } = valorDeLote(lote);
                  return (
                    <FilaDeRentabilidad
                      key={lote.id}
                      to={`/admin/rentabilidad/lotes/${lote.id}`}
                      antes="Lote"
                      nombre={`#${lote.id}`}
                      nombreCifra
                      detalle={[lote.proveedorNombre, TEXTO_DEL_ESTADO_DEL_LOTE[lote.estado]]}
                      valor={valor}
                      que={que}
                    />
                  );
                })}
              </ul>
            </BloquePanel>
          ) : null}
        </>
      )}
    </>
  );
}
