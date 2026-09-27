import type { ReactNode } from "react";
import { Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoTexto } from "~/componentes/campos";
import { Icono } from "~/componentes/icono";
import { Grupo, Renglon, Renglones } from "~/componentes/renglon";
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

/** "1 lote", "3 lotes". */
export function cuenta(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** "2026-09-01" → "01/09/26" (el día tal como viene en la URL). */
function diaCorto(texto: string): string {
  const [anio, mes, dia] = texto.split("-");
  return `${dia}/${mes}/${anio.slice(2)}`;
}

/** El rango de fechas en palabras cortas, o `undefined` sin filtro. */
function rangoTexto(desde: string, hasta: string): string | undefined {
  const valido = (texto: string) => /^\d{4}-\d{2}-\d{2}$/.test(texto);
  if (valido(desde) && valido(hasta)) return `${diaCorto(desde)} – ${diaCorto(hasta)}`;
  if (valido(desde)) return `desde ${diaCorto(desde)}`;
  if (valido(hasta)) return `hasta ${diaCorto(hasta)}`;
  return undefined;
}

/**
 * Cabecera de la pantalla: el nombre (lote o proveedor) como número de
 * comprobante, una línea de detalle y, a la derecha, el sello del estado.
 */
export function CabeceraDeRentabilidad({
  titulo,
  antes,
  cifra = false,
  detalle,
  sello,
}: {
  titulo: ReactNode;
  /** Palabra chica antes del título ("Lote"). */
  antes?: string;
  /** El título es una cifra (Lote #3) y va en Martian Mono. */
  cifra?: boolean;
  detalle?: ReactNode;
  sello?: ReactNode;
}) {
  return (
    <div className="pieza-cabecera">
      <div>
        <h2 className={cifra ? "pieza-cabecera-ref" : "rentabilidad-nombre"}>
          {antes ? <span>{antes}</span> : null}
          {titulo}
        </h2>
        {detalle ? <p className="pieza-cabecera-detalle">{detalle}</p> : null}
      </div>
      {sello}
    </div>
  );
}

/**
 * El filtro por fecha de compra, por GET: la URL se puede compartir y
 * recargar. `accion` es la ruta de la pantalla, para "Quitar".
 */
export function FiltroDeFechas({
  accion,
  desde,
  hasta,
  errores,
}: {
  accion: string;
  desde: string;
  hasta: string;
  errores: Record<string, string>;
}) {
  const rango = rangoTexto(desde, hasta);
  const activo = Boolean(desde || hasta);

  return (
    <BloquePanel
      titulo="Fecha de compra"
      detalle={rango}
      completo={Boolean(rango) && Object.keys(errores).length === 0}
    >
      <Form method="get" action={accion} className="filtro-rentabilidad">
        <div className="filtro-rentabilidad-fechas">
          <Campo etiqueta="Desde" para="desde">
            <CampoTexto
              id="desde"
              name="desde"
              type="date"
              defaultValue={desde}
              aria-invalid={errores.desde ? true : undefined}
              aria-describedby={errores.desde ? "desde-error" : undefined}
            />
          </Campo>
          <Campo etiqueta="Hasta" para="hasta">
            <CampoTexto
              id="hasta"
              name="hasta"
              type="date"
              defaultValue={hasta}
              aria-invalid={errores.hasta ? true : undefined}
              aria-describedby={errores.hasta ? "hasta-error" : undefined}
            />
          </Campo>
        </div>
        {errores.desde ? (
          <p className="campo-error" id="desde-error" role="alert">
            {errores.desde}
          </p>
        ) : null}
        {errores.hasta ? (
          <p className="campo-error" id="hasta-error" role="alert">
            {errores.hasta}
          </p>
        ) : null}
        <div className={activo ? "filtro-rentabilidad-botones" : undefined}>
          <button type="submit" className="btn">
            Filtrar
          </button>
          {activo ? (
            <Link className="btn btn-suave" to={accion} preventScrollReset>
              Quitar
            </Link>
          ) : null}
        </div>
      </Form>
    </BloquePanel>
  );
}

/**
 * El cierre de las cifras, con el eco del TOTAL: una regla doble y la cifra
 * grande. En curso manda el % recuperado; terminado, la rentabilidad.
 */
function CierreDeCifras({
  etiqueta,
  valor,
  debajo,
}: {
  etiqueta: string;
  valor: string;
  debajo?: ReactNode;
}) {
  return (
    <div className="total total-rentabilidad">
      <b>{etiqueta}</b>
      <div>
        <strong className="cifra">{valor}</strong>
        {debajo ? <small>{debajo}</small> : null}
      </div>
    </div>
  );
}

/**
 * Las cifras de un lote o un proveedor: de dónde sale el costo imputado, los
 * ingresos, las piezas y el cierre (recuperado o rentabilidad).
 */
export function CifrasDeRentabilidadBloque({
  cifras,
  porcentajeRecuperado,
  terminado = false,
  costos,
  pie,
}: {
  cifras: CifrasDeRentabilidad;
  porcentajeRecuperado: number;
  terminado?: boolean;
  /** Los renglones que suman el costo imputado (costo, transporte…). */
  costos?: ReactNode;
  pie?: ReactNode;
}) {
  return (
    <BloquePanel titulo="Cifras" nuncaSePublica>
      {costos ? (
        <>
          <Grupo>Costo</Grupo>
          <Renglones>
            {costos}
            <div className="renglon renglon-suma">
              <dt>Costo imputado</dt>
              <dd className="cifra">{monto(cifras.costoImputadoCentavos)}</dd>
            </div>
          </Renglones>
          <Grupo>Ventas</Grupo>
        </>
      ) : (
        <Renglones>
          <Renglon
            etiqueta="Costo imputado"
            cifra
            aclaracion="costo, transporte, reacondicionamiento y entregas"
          >
            {monto(cifras.costoImputadoCentavos)}
          </Renglon>
        </Renglones>
      )}
      <Renglones>
        <Renglon etiqueta="Vendidas" cifra>
          {cifras.vendidas} de {cifras.piezas}
        </Renglon>
        <Renglon etiqueta="Retiradas" cifra>
          {cifras.retiradas}
        </Renglon>
        <Renglon etiqueta="Sin vender" cifra>
          {cifras.sinVender}
        </Renglon>
        <Renglon etiqueta="Ingresos" cifra>
          {monto(cifras.ingresosCentavos)}
        </Renglon>
      </Renglones>
      {terminado ? (
        <CierreDeCifras
          etiqueta="RENTABILIDAD"
          valor={monto(cifras.margenCentavos)}
          debajo={
            <>
              <span>{porcentajeTexto(porcentajeRecuperado)}</span> recuperado
            </>
          }
        />
      ) : (
        <CierreDeCifras
          etiqueta="RECUPERADO"
          valor={porcentajeTexto(porcentajeRecuperado)}
          debajo={
            <>
              margen hasta hoy <span>{monto(cifras.margenCentavos)}</span>
            </>
          }
        />
      )}
      {pie}
    </BloquePanel>
  );
}

/** La distribución de condiciones de ingreso y el descarte. */
function RenglonesDeCalidad({ calidad }: { calidad: CalidadDetectada }) {
  const total = CONDICIONES.reduce((suma, c) => suma + calidad.condiciones[c], 0) + calidad.sinCondicion;
  const parte = (n: number) =>
    total > 0 && n > 0 ? `${Math.round((n / total) * 100)} %` : undefined;

  return (
    <Renglones>
      {CONDICIONES.map((condicion) => (
        <Renglon
          key={condicion}
          etiqueta={TEXTO_DE_CONDICION[condicion]}
          cifra
          aclaracion={parte(calidad.condiciones[condicion])}
        >
          {calidad.condiciones[condicion]}
        </Renglon>
      ))}
      {calidad.sinCondicion > 0 ? (
        <Renglon etiqueta="Sin condición" cifra aclaracion={parte(calidad.sinCondicion)}>
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
            : `${calidad.descartes} de ${calidad.unidadesRecibidas} unidades, con irrecuperables`
        }
      >
        {porcentajeTexto(calidad.porcentajeDescarte)}
      </Renglon>
    </Renglones>
  );
}

/**
 * La calidad detectada al lado de la declarada. Con `porDeclarada`, un grupo
 * por cada calidad declarada ("su Primera resulta…").
 */
export function BloqueDeCalidad({
  calidadDeclarada,
  calidad,
  porDeclarada,
}: {
  calidadDeclarada?: string;
  calidad: CalidadDetectada;
  porDeclarada?: { nombre: string; lotes: number; calidad: CalidadDetectada }[];
}) {
  const grupos = porDeclarada ?? [];

  return (
    <BloquePanel titulo="Calidad detectada">
      {calidadDeclarada ? (
        <Renglones>
          <Renglon etiqueta="Declarada">{calidadDeclarada}</Renglon>
        </Renglones>
      ) : null}
      {grupos.length === 1 ? (
        <>
          <Renglones>
            <Renglon etiqueta="Declarada" aclaracion={cuenta(grupos[0].lotes, "lote", "lotes")}>
              {grupos[0].nombre}
            </Renglon>
          </Renglones>
          <RenglonesDeCalidad calidad={calidad} />
        </>
      ) : grupos.length > 1 ? (
        <>
          <Grupo>Todos sus lotes</Grupo>
          <RenglonesDeCalidad calidad={calidad} />
          {grupos.map((grupo) => (
            <div key={grupo.nombre}>
              <Grupo>
                Declarada {grupo.nombre} · {cuenta(grupo.lotes, "lote", "lotes")}
              </Grupo>
              <RenglonesDeCalidad calidad={grupo.calidad} />
            </div>
          ))}
        </>
      ) : (
        <RenglonesDeCalidad calidad={calidad} />
      )}
    </BloquePanel>
  );
}

/**
 * Una tabla de desglose. En el celular cada fila es un renglón con el margen a
 * la derecha y las demás cifras debajo; desde 560px, una tabla de 6 columnas.
 */
function TablaDeDesglose({
  titulo,
  filas,
}: {
  titulo: string;
  filas: { clave: string; nombre: string; cifras: CifrasDeRentabilidad }[];
}) {
  return (
    <BloquePanel titulo={titulo} detalle={filas.length > 0 ? String(filas.length) : undefined}>
      {filas.length === 0 ? (
        <p className="ayuda">Todavía no hay piezas.</p>
      ) : (
        <table className="tabla-rentabilidad">
          <thead>
            <tr>
              <th scope="col">
                <span className="sr-only">{titulo}</span>
              </th>
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
                <td className="cifra" data-etiqueta="Piezas">
                  {cifras.piezas}
                </td>
                <td className="cifra" data-etiqueta="Vendidas">
                  {cifras.vendidas}
                </td>
                <td className="cifra" data-etiqueta="Ingresos">
                  {monto(cifras.ingresosCentavos)}
                </td>
                <td className="cifra" data-etiqueta="Costo">
                  {monto(cifras.costoImputadoCentavos)}
                </td>
                <td className="cifra tabla-rentabilidad-margen" data-etiqueta="Margen">
                  {monto(cifras.margenCentavos)}
                </td>
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

/**
 * Una fila de las listas de rentabilidad: nombre y detalle a la izquierda, la
 * cifra que manda y qué es, a la derecha.
 */
export function FilaDeRentabilidad({
  to,
  nombre,
  nombreCifra = false,
  detalle,
  valor,
  que,
}: {
  to: string;
  nombre: ReactNode;
  nombreCifra?: boolean;
  detalle: ReactNode;
  valor: ReactNode;
  /** Qué es el valor: "recuperado", "rentabilidad", "margen". */
  que: string;
}) {
  return (
    <li>
      <Link className="fila-pieza fila-rentabilidad" to={to}>
        <span>
          <span className={nombreCifra ? "fila-pieza-ref" : "fila-rentabilidad-nombre"}>
            {nombre}
          </span>
          <span className="fila-pieza-nombre">{detalle}</span>
        </span>
        <span className="fila-pieza-derecha">
          <span className="fila-rentabilidad-valor">
            <span className="cifra">{valor}</span>
            <small>{que}</small>
          </span>
          <Icono nombre="adelante" />
        </span>
      </Link>
    </li>
  );
}

/** Lo que dice la fila de un lote a la derecha, según su estado. */
export function valorDeLote(lote: {
  estado: EstadoDelLote;
  margenCentavos: number;
  porcentajeRecuperado: number;
}): { valor: string; que: string } {
  if (lote.estado === "terminado") return { valor: monto(lote.margenCentavos), que: "rentabilidad" };
  return { valor: porcentajeTexto(lote.porcentajeRecuperado), que: "recuperado" };
}
