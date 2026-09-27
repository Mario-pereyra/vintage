import { Form } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoTexto } from "~/componentes/campos";
import { Renglon, Renglones } from "~/componentes/renglon";
import {
  CONDICIONES,
  TEXTO_DE_CONDICION,
  type CalidadDetectada,
  type CifrasDeRentabilidad,
  type EstadoDelLote,
  type FilaPorCondicion,
  type FilaPorTipo,
} from "~/dominio";

import { bolivianos } from "../textos-de-venta";

/** Piezas comunes a las pantallas de rentabilidad (internas: nunca se publican). */

export const TEXTO_DEL_ESTADO_DEL_LOTE: Record<EstadoDelLote, string> = {
  sin_abrir: "Sin abrir",
  en_curso: "En curso",
  terminado: "Terminado",
};

/** "Bs 150" o "−Bs 150". */
export function monto(centavos: number): string {
  return centavos < 0 ? `−Bs ${bolivianos(-centavos)}` : `Bs ${bolivianos(centavos)}`;
}

export function porcentajeTexto(valor: number | null): string {
  return valor === null ? "—" : `${valor.toLocaleString("es-BO")} %`;
}

/** El filtro por fecha de compra, por GET: la URL se puede compartir y recargar. */
export function FiltroDeFechas({
  desde,
  hasta,
  errores,
}: {
  desde: string;
  hasta: string;
  errores: Record<string, string>;
}) {
  return (
    <Form method="get" className="filtro-rentabilidad">
      <Campo etiqueta="Comprados desde" para="desde" ayuda={errores.desde}>
        <CampoTexto
          id="desde"
          name="desde"
          type="date"
          defaultValue={desde}
          aria-invalid={errores.desde ? true : undefined}
        />
      </Campo>
      <Campo etiqueta="Hasta" para="hasta" ayuda={errores.hasta}>
        <CampoTexto
          id="hasta"
          name="hasta"
          type="date"
          defaultValue={hasta}
          aria-invalid={errores.hasta ? true : undefined}
        />
      </Campo>
      <button type="submit" className="btn btn-ancho">
        Filtrar
      </button>
    </Form>
  );
}

/** Ingresos, costo imputado, margen y conteo de piezas. */
export function RenglonesDeCifras({
  cifras,
  porcentajeRecuperado,
  terminado = false,
}: {
  cifras: CifrasDeRentabilidad;
  porcentajeRecuperado?: number;
  terminado?: boolean;
}) {
  return (
    <Renglones>
      <Renglon etiqueta="Ingresos" cifra>
        {monto(cifras.ingresosCentavos)}
      </Renglon>
      <Renglon etiqueta="Costo imputado" cifra>
        {monto(cifras.costoImputadoCentavos)}
      </Renglon>
      <Renglon etiqueta={terminado ? "Rentabilidad" : "Margen hasta hoy"} cifra calculado>
        {monto(cifras.margenCentavos)}
      </Renglon>
      {porcentajeRecuperado !== undefined ? (
        <Renglon etiqueta="Recuperado" cifra calculado>
          {porcentajeTexto(porcentajeRecuperado)}
        </Renglon>
      ) : null}
      <Renglon etiqueta="Piezas" cifra aclaracion="vendidas · retiradas · sin vender">
        {cifras.piezas} = {cifras.vendidas} · {cifras.retiradas} · {cifras.sinVender}
      </Renglon>
    </Renglones>
  );
}

export function BloqueDeCalidad({
  calidadDeclarada,
  calidad,
}: {
  calidadDeclarada?: string;
  calidad: CalidadDetectada;
}) {
  return (
    <BloquePanel titulo="Calidad detectada" nuncaSePublica>
      <Renglones>
        {calidadDeclarada ? <Renglon etiqueta="Declarada">{calidadDeclarada}</Renglon> : null}
        {CONDICIONES.map((condicion) => (
          <Renglon key={condicion} etiqueta={TEXTO_DE_CONDICION[condicion]} cifra>
            {calidad.condiciones[condicion]}
          </Renglon>
        ))}
        {calidad.sinCondicion > 0 ? (
          <Renglon etiqueta="Sin condición" cifra>
            {calidad.sinCondicion}
          </Renglon>
        ) : null}
        <Renglon
          etiqueta="Descarte"
          cifra
          calculado
          aclaracion={
            calidad.unidadesRecibidas === null
              ? "sin abrir"
              : `${calidad.descartes} de ${calidad.unidadesRecibidas} unidades (incluye irrecuperables)`
          }
        >
          {porcentajeTexto(calidad.porcentajeDescarte)}
        </Renglon>
      </Renglones>
    </BloquePanel>
  );
}

function TablaDeDesglose({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { clave: string; nombre: string; cifras: CifrasDeRentabilidad }[];
}) {
  return (
    <BloquePanel titulo={titulo} nuncaSePublica>
      {filas.length === 0 ? (
        <p className="ayuda">Todavía no hay piezas.</p>
      ) : (
        <table className="tabla-rentabilidad">
          <thead>
            <tr>
              <th scope="col" />
              <th scope="col">Piezas</th>
              <th scope="col">Vendidas</th>
              <th scope="col">Ingresos</th>
              <th scope="col">Costo</th>
              <th scope="col">Margen</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ clave, nombre, cifras }) => (
              <tr key={clave}>
                <th scope="row">{nombre}</th>
                <td className="cifra">{cifras.piezas}</td>
                <td className="cifra">{cifras.vendidas}</td>
                <td className="cifra">{monto(cifras.ingresosCentavos)}</td>
                <td className="cifra">{monto(cifras.costoImputadoCentavos)}</td>
                <td className="cifra">{monto(cifras.margenCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BloquePanel>
  );
}

export function Desglose({
  porTipo,
  porCondicion,
}: {
  porTipo: FilaPorTipo[];
  porCondicion: FilaPorCondicion[];
}) {
  return (
    <>
      <TablaDeDesglose
        titulo="Por tipo de cartera"
        filas={porTipo.map((fila) => ({
          clave: fila.nombre ?? "—",
          nombre: fila.nombre ?? "Sin tipo",
          cifras: fila,
        }))}
      />
      <TablaDeDesglose
        titulo="Por condición de ingreso"
        filas={porCondicion.map((fila) => ({
          clave: fila.condicion ?? "—",
          nombre: fila.condicion ? TEXTO_DE_CONDICION[fila.condicion] : "Sin condición",
          cifras: fila,
        }))}
      />
    </>
  );
}
