import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BarraAccionUnica, motivoDeFaltantes } from "~/componentes/barra-acciones";
import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoCifra, CampoTexto } from "~/componentes/campos";
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

/** Hoy en Bolivia, como "2026-09-26", para proponerlo como fecha de apertura. */
function hoyEnBolivia() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const id = Number(params.id);
  const lote = Number.isSafeInteger(id) ? await dominio.loteDelPanel(id) : null;
  if (!lote) throw data(null, { status: 404 });
  const piezas = lote.abierto ? await dominio.listarPiezasDeLote(id) : [];
  return { lote, piezas, hoy: hoyEnBolivia() };
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

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="campo-error" role="alert">
      {texto}
    </p>
  ) : null;
}

/** "3" → 3; vacío o no entero → null. */
function leerConteo(texto: string): number | null {
  return /^\d+$/.test(texto.trim()) ? Number(texto.trim()) : null;
}

const OPCIONES_DE_CONDICION = CONDICIONES.map((valor) => ({
  valor,
  texto: TEXTO_DE_CONDICION[valor],
}));

function FormularioDeApertura({
  hoy,
  errores,
}: {
  hoy: string;
  errores: Partial<Record<string, string>>;
}) {
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const [fechaApertura, setFechaApertura] = useState(hoy);
  const [unidadesRecibidas, setUnidadesRecibidas] = useState("");
  const [descartes, setDescartes] = useState("");
  const [todas, setTodas] = useState<CondicionDePieza | null>(null);
  const [condiciones, setCondiciones] = useState<(CondicionDePieza | null)[]>([]);

  const recibidas = leerConteo(unidadesRecibidas);
  const descartadas = descartes.trim() ? leerConteo(descartes) : 0;
  const descartesDeMas = recibidas !== null && descartadas !== null && descartadas > recibidas;
  const esperadas =
    recibidas !== null && descartadas !== null && !descartesDeMas ? recibidas - descartadas : 0;

  // Una condición por cada pieza que no fue descarte; las nuevas nacen con la
  // de "todas", si ya se eligió.
  if (condiciones.length !== esperadas) {
    setCondiciones((actual) => {
      const siguiente = actual.slice(0, esperadas);
      while (siguiente.length < esperadas) siguiente.push(todas);
      return siguiente;
    });
  }

  const sinCondicion = condiciones.filter((condicion) => condicion === null).length;
  const motivo = descartesDeMas
    ? "Hay más descartes que unidades recibidas"
    : recibidas !== null && esperadas === 0
      ? "No queda ninguna pieza para crear"
      : motivoDeFaltantes(
          [
            !fechaApertura && "la fecha",
            recibidas === null && "las unidades recibidas",
            descartadas === null && "un número de descartes válido",
            sinCondicion > 0 &&
              (sinCondicion === 1
                ? "la condición de 1 pieza"
                : `la condición de ${sinCondicion} piezas`),
          ].filter((falta): falta is string => Boolean(falta)),
        );

  return (
    <Form method="post">
      <BloquePanel titulo="Apertura">
        <p className="ayuda">
          Se registra una sola vez: crea una pieza En preparación por cada unidad recibida que
          no fue descarte. Los descartes no reciben parte del costo.
        </p>
        <Campo etiqueta="Fecha de apertura" para="fecha">
          <CampoTexto
            id="fecha"
            name="fecha"
            type="date"
            value={fechaApertura}
            onChange={(evento) => setFechaApertura(evento.target.value)}
            aria-invalid={errores.fecha ? true : undefined}
          />
          <MensajeDeError texto={errores.fecha} />
        </Campo>

        <div className="par-cifras">
          <Campo etiqueta="Unidades recibidas" para="unidadesRecibidas">
            <CampoCifra
              id="unidadesRecibidas"
              name="unidadesRecibidas"
              inputMode="numeric"
              unidad="u."
              value={unidadesRecibidas}
              onChange={(evento) => setUnidadesRecibidas(evento.target.value)}
              aria-invalid={errores.unidadesRecibidas ? true : undefined}
            />
          </Campo>
          <Campo etiqueta="Descartes" para="descartes">
            <CampoCifra
              id="descartes"
              name="descartes"
              inputMode="numeric"
              unidad="u."
              value={descartes}
              onChange={(evento) => setDescartes(evento.target.value)}
              aria-invalid={errores.descartes || descartesDeMas ? true : undefined}
            />
          </Campo>
        </div>
        <MensajeDeError texto={errores.unidadesRecibidas} />
        <MensajeDeError texto={errores.descartes} />
        <p className="derivado" aria-live="polite">
          {esperadas > 0 ? (
            <>
              → Crea <span className="cifra">{esperadas}</span>{" "}
              {esperadas === 1 ? "pieza" : "piezas"} En preparación
            </>
          ) : null}
        </p>

        <Campo etiqueta="Nota de apertura" para="notaApertura" ayuda="Opcional: cómo resultó el lote.">
          <CampoTexto
            id="notaApertura"
            name="notaApertura"
            placeholder="Ej.: Resultó de segunda"
            aria-invalid={errores.notaApertura ? true : undefined}
          />
          <MensajeDeError texto={errores.notaApertura} />
        </Campo>

        {esperadas > 0 ? (
          <div className="condiciones" role="group" aria-labelledby="et-condiciones">
            <p className="grupo" id="et-condiciones">
              Condición de ingreso
            </p>
            <Campo
              etiqueta="Todas las piezas"
              idEtiqueta="et-condicion-todas"
              ayuda="Marca la más común y corrige abajo las que no."
            >
              <ControlSegmentado
                etiquetadoPor="et-condicion-todas"
                opciones={OPCIONES_DE_CONDICION}
                valor={todas}
                alCambiar={(valor) => {
                  setTodas(valor);
                  setCondiciones((actual) => actual.map(() => valor));
                }}
              />
            </Campo>
            {condiciones.map((condicion, indice) => (
              <div className="condicion-pieza" key={indice}>
                <Campo
                  etiqueta={
                    <>
                      Pieza<span className="cifra">{indice + 1}</span>
                    </>
                  }
                  idEtiqueta={`et-condicion-${indice}`}
                >
                  <ControlSegmentado
                    etiquetadoPor={`et-condicion-${indice}`}
                    name={`condicion-${indice}`}
                    opciones={OPCIONES_DE_CONDICION}
                    valor={condicion}
                    alCambiar={(valor) =>
                      setCondiciones((actual) => actual.map((c, i) => (i === indice ? valor : c)))
                    }
                  />
                </Campo>
              </div>
            ))}
            <MensajeDeError texto={errores.condicionesDeIngreso} />
          </div>
        ) : null}
      </BloquePanel>

      <BarraAccionUnica
        texto={
          enviando
            ? "Abriendo…"
            : esperadas > 0
              ? `Abrir y crear ${esperadas} ${esperadas === 1 ? "pieza" : "piezas"}`
              : "Abrir lote"
        }
        motivo={motivo}
        disabled={enviando || motivo !== undefined}
      />
    </Form>
  );
}

export default function DetalleDeLote({ loaderData, actionData }: Route.ComponentProps) {
  const { lote, piezas, hoy } = loaderData;
  const errores = actionData && "errores" in actionData ? (actionData.errores ?? {}) : {};
  const mensaje = actionData && "mensaje" in actionData ? actionData.mensaje : undefined;
  const totalCentavos = lote.costoCentavos + lote.transporteCentavos;

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

      <BloquePanel titulo="Compra" nuncaSePublica>
        <Renglones>
          <Renglon etiqueta="Proveedor">{lote.proveedorNombre}</Renglon>
          <Renglon etiqueta="Canal">{TEXTO_DE_CANAL[lote.canal]}</Renglon>
          <Renglon etiqueta="Calidad declarada">{lote.calidadDeclaradaNombre}</Renglon>
          <Renglon etiqueta="Costo" cifra>
            {formatearPrecio(lote.costoCentavos / 100)}
          </Renglon>
          <Renglon etiqueta="Transporte" cifra>
            {formatearPrecio(lote.transporteCentavos / 100)}
          </Renglon>
          <Renglon etiqueta="Comprado" cifra>
            {fecha(lote.fechaCompra)}
          </Renglon>
          <Renglon etiqueta="Recibido" cifra={lote.fechaRecepcion !== null}>
            {lote.fechaRecepcion ? fecha(lote.fechaRecepcion) : "Todavía no"}
          </Renglon>
        </Renglones>
      </BloquePanel>

      {lote.abierto ? (
        <>
          <BloquePanel titulo="Apertura">
            <Renglones>
              <Renglon etiqueta="Abierto" cifra>
                {fecha(lote.fechaApertura!)}
              </Renglon>
              <Renglon etiqueta="Recibidas" cifra>
                {lote.unidadesRecibidas}
              </Renglon>
              <Renglon etiqueta="Descartes" cifra>
                {lote.descartes}
              </Renglon>
              {lote.notaApertura ? (
                <Renglon etiqueta="Nota" nota>
                  {lote.notaApertura}
                </Renglon>
              ) : null}
              {piezas.length > 0 ? (
                <Renglon
                  etiqueta="Por pieza"
                  cifra
                  calculado
                  aclaracion={`${formatearPrecio(totalCentavos / 100)} ÷ ${piezas.length}, sin reacondicionar`}
                >
                  {formatearPrecio(Math.round(totalCentavos / piezas.length) / 100)}
                </Renglon>
              ) : null}
            </Renglones>
          </BloquePanel>

          <BloquePanel
            titulo="Piezas del lote"
            detalle={piezas.length === 1 ? "1 pieza" : `${piezas.length} piezas`}
          >
            {mensaje ? (
              <p className="guardado guardado-arriba" role="status">
                {mensaje}
              </p>
            ) : null}
            <ul className="filas-pieza">
              {piezas.map((pieza) => (
                <li key={pieza.codigo}>
                  <Link className="fila-pieza" to={`/admin/piezas/${pieza.codigo}`}>
                    <span>
                      <span className="fila-pieza-ref">{pieza.codigo}</span>
                      <span
                        className={
                          pieza.nombre
                            ? "fila-pieza-nombre"
                            : "fila-pieza-nombre fila-pieza-nombre-vacio"
                        }
                      >
                        {pieza.nombre ?? "Sin nombre todavía"}
                      </span>
                    </span>
                    <span className="fila-pieza-derecha">
                      {pieza.precioCentavos !== null ? (
                        <span className="fila-pieza-precio">
                          {formatearPrecio(pieza.precioCentavos / 100)}
                        </span>
                      ) : (
                        <span className="fila-pieza-precio-vacio">Sin precio</span>
                      )}
                      <Icono nombre="adelante" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </BloquePanel>
        </>
      ) : (
        <FormularioDeApertura hoy={hoy} errores={errores} />
      )}
    </>
  );
}
