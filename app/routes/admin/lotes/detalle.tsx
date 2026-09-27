import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoTexto } from "~/componentes/campos";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { formatearPrecio } from "~/componentes/total";
import { CONDICIONES, TEXTO_DE_CANAL, TEXTO_DE_CONDICION, type CondicionDePieza } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFormularioDeApertura } from "~/servidor/formulario-de-abastecimiento.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/detalle";

export const handle = { titulo: "Lote", volverA: "/admin/lotes" } satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const id = Number(params.id);
  const lote = Number.isSafeInteger(id) ? await dominio.loteDelPanel(id) : null;
  if (!lote) throw data(null, { status: 404 });
  const piezas = lote.abierto ? await dominio.listarPiezasDeLote(id) : [];
  return { lote, piezas };
}

/** Abre el lote: crea sus piezas En preparación con la condición de ingreso de cada una. */
export async function action({ params, request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  try {
    await dominio.abrirLote(Number(params.id), leerFormularioDeApertura(await request.formData()));
    return { mensaje: "Lote abierto: ya puedes cargar los datos de cada pieza." };
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

function FormularioDeApertura({
  errores,
}: {
  errores: Partial<Record<string, string>>;
}) {
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const [unidadesRecibidas, setUnidadesRecibidas] = useState("");
  const [descartes, setDescartes] = useState("");
  const [condiciones, setCondiciones] = useState<(CondicionDePieza | null)[]>([]);

  const esperadas = Math.max(
    (Number(unidadesRecibidas) || 0) - (Number(descartes) || 0),
    0,
  );
  if (condiciones.length !== esperadas) {
    setCondiciones((actual) => {
      const siguiente = actual.slice(0, esperadas);
      while (siguiente.length < esperadas) siguiente.push(null);
      return siguiente;
    });
  }

  return (
    <BloquePanel titulo="Apertura">
      <p className="ayuda">
        Se registra una sola vez: crea una pieza En preparación por cada unidad recibida
        que no fue descarte.
      </p>
      <Form method="post">
        <Campo etiqueta="Fecha de apertura" para="fecha">
          <CampoTexto id="fecha" name="fecha" type="date" aria-invalid={errores.fecha ? true : undefined} />
          {errores.fecha ? <p className="campo-error" role="alert">{errores.fecha}</p> : null}
        </Campo>
        <Campo etiqueta="Unidades recibidas" para="unidadesRecibidas">
          <CampoTexto
            id="unidadesRecibidas"
            name="unidadesRecibidas"
            inputMode="numeric"
            value={unidadesRecibidas}
            onChange={(e) => setUnidadesRecibidas(e.target.value)}
            aria-invalid={errores.unidadesRecibidas ? true : undefined}
          />
          {errores.unidadesRecibidas ? (
            <p className="campo-error" role="alert">{errores.unidadesRecibidas}</p>
          ) : null}
        </Campo>
        <Campo etiqueta="Descartes" para="descartes">
          <CampoTexto
            id="descartes"
            name="descartes"
            inputMode="numeric"
            value={descartes}
            onChange={(e) => setDescartes(e.target.value)}
            aria-invalid={errores.descartes ? true : undefined}
          />
          {errores.descartes ? <p className="campo-error" role="alert">{errores.descartes}</p> : null}
        </Campo>
        <Campo etiqueta="Nota de apertura" para="notaApertura" ayuda="Opcional: tu impresión del lote.">
          <CampoTexto id="notaApertura" name="notaApertura" placeholder="Ej.: Resultó de segunda" />
        </Campo>

        {esperadas > 0 ? (
          <div className="campo">
            <div className="etiqueta">
              <span id="et-condiciones">Condición de ingreso de cada pieza</span>
            </div>
            {condiciones.map((condicion, indice) => (
              <Campo key={indice} etiqueta={`Pieza ${indice + 1}`} idEtiqueta={`et-condicion-${indice}`}>
                <ControlSegmentado
                  etiquetadoPor={`et-condicion-${indice}`}
                  name={`condicion-${indice}`}
                  opciones={CONDICIONES.map((valor) => ({ valor, texto: TEXTO_DE_CONDICION[valor] }))}
                  valor={condicion}
                  alCambiar={(valor) =>
                    setCondiciones((actual) => actual.map((c, i) => (i === indice ? valor : c)))
                  }
                />
              </Campo>
            ))}
            {errores.condicionesDeIngreso ? (
              <p className="campo-error" role="alert">{errores.condicionesDeIngreso}</p>
            ) : null}
          </div>
        ) : null}

        <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
          {enviando ? "Abriendo…" : "Abrir lote"}
        </button>
      </Form>
    </BloquePanel>
  );
}

export default function DetalleDeLote({ loaderData, actionData }: Route.ComponentProps) {
  const { lote, piezas } = loaderData;
  const errores = actionData && "errores" in actionData ? (actionData.errores ?? {}) : {};

  return (
    <>
      <div className="pieza-cabecera">
        <div>
          <p className="pieza-cabecera-ref">
            <span>Lote</span>#{lote.id}
          </p>
          <p className="pieza-cabecera-detalle">
            {lote.proveedorNombre} · {TEXTO_DE_CANAL[lote.canal]}
          </p>
        </div>
        <Sello texto={lote.abierto ? "Abierto" : "Sin abrir"} />
      </div>

      <BloquePanel titulo="Compra">
        <Renglones>
          <Renglon etiqueta="Calidad declarada">{lote.calidadDeclaradaNombre}</Renglon>
          <Renglon etiqueta="Costo" cifra>{formatearPrecio(lote.costoCentavos / 100)}</Renglon>
          <Renglon etiqueta="Transporte" cifra>{formatearPrecio(lote.transporteCentavos / 100)}</Renglon>
          <Renglon etiqueta="Fecha de compra" cifra>{fecha(lote.fechaCompra)}</Renglon>
          {lote.fechaRecepcion ? (
            <Renglon etiqueta="Fecha de recepción" cifra>{fecha(lote.fechaRecepcion)}</Renglon>
          ) : null}
        </Renglones>
      </BloquePanel>

      {lote.abierto ? (
        <>
          <BloquePanel titulo="Apertura">
            <Renglones>
              <Renglon etiqueta="Fecha" cifra>{fecha(lote.fechaApertura!)}</Renglon>
              <Renglon etiqueta="Unidades recibidas" cifra>{lote.unidadesRecibidas}</Renglon>
              <Renglon etiqueta="Descartes" cifra>{lote.descartes}</Renglon>
              {lote.notaApertura ? <Renglon etiqueta="Nota" nota>{lote.notaApertura}</Renglon> : null}
            </Renglones>
          </BloquePanel>

          <BloquePanel titulo="Piezas del lote" detalle={`${piezas.length}`}>
            <ul className="filas-pieza">
              {piezas.map((pieza) => (
                <li key={pieza.codigo}>
                  <Link className="fila-pieza" to={`/admin/piezas/${pieza.codigo}`}>
                    <span>
                      <span className="fila-pieza-ref">{pieza.codigo}</span>
                      <span className="fila-pieza-nombre">{pieza.nombre ?? "Sin nombre todavía"}</span>
                    </span>
                    <Icono nombre="adelante" />
                  </Link>
                </li>
              ))}
            </ul>
          </BloquePanel>
        </>
      ) : (
        <FormularioDeApertura errores={errores} />
      )}
    </>
  );
}
