import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BloqueNuncaSePublica, BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { Campo, CampoTexto, Seleccion } from "~/componentes/campos";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { ErrorDeDominio, type ModalidadDeLaEntrega } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { hoyEnBolivia, leerVenta } from "~/servidor/formulario-de-venta.server";

import type { BarraDelPanel } from "../layout";
import {
  bolivianos,
  fechaDeBolivia,
  TEXTO_DE_LA_MODALIDAD,
  TEXTO_DEL_CANAL,
  TEXTO_DEL_ESTADO_DE_ENTREGA,
} from "../textos-de-venta";
import type { Route } from "./+types/venta";
import { TEXTO_DEL_ESTADO } from "./formulario-de-pieza";

export const handle = {
  titulo: "Venta y entrega",
  volverA: "/admin/piezas",
} satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const pieza = await dominio.piezaDelPanel(params.codigo);
  if (!pieza) throw data(null, { status: 404 });
  const [venta, reserva] = await Promise.all([
    dominio.ventaDePieza(pieza.codigo),
    dominio.reservaActiva(pieza.codigo),
  ]);
  return { pieza, venta, reserva, hoy: hoyEnBolivia() };
}

type Intencion = "vender" | "entregada" | "guia";

type Resultado = {
  intencion: Intencion;
  mensaje: string;
  errores?: Record<string, string>;
};

export async function action({ params, request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const formulario = await request.formData();
  const intencion = String(formulario.get("intencion")) as Intencion;
  const hecho = (mensaje: string): Resultado => ({ intencion, mensaje });
  try {
    switch (intencion) {
      case "vender":
        await dominio.registrarVenta(leerVenta(params.codigo, formulario));
        return hecho("Venta registrada: la pieza está Vendida.");
      case "entregada":
        await dominio.marcarEntregada(params.codigo);
        return hecho("Entrega marcada como entregada.");
      case "guia":
        await dominio.registrarGuia(params.codigo, String(formulario.get("guia") ?? ""));
        return hecho("Guía guardada.");
      default:
        throw data(null, { status: 400 });
    }
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return data<Resultado>(
      { intencion, mensaje: error.message, errores: { ...error.errores } },
      { status: 400 },
    );
  }
}

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="campo-error" role="alert">
      {texto}
    </p>
  ) : null;
}

const MODALIDADES = Object.keys(TEXTO_DE_LA_MODALIDAD) as ModalidadDeLaEntrega[];

export default function VentaDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, venta, reserva, hoy } = loaderData;
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const errores: Partial<Record<string, string>> =
    actionData?.intencion === "vender" ? (actionData.errores ?? {}) : {};
  const [modalidad, setModalidad] = useState<ModalidadDeLaEntrega>("delivery_santa_cruz");
  const [pagoVerificado, setPagoVerificado] = useState(false);

  const mensaje = actionData ? (
    <p
      className={actionData.errores ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
      role={actionData.errores ? "alert" : "status"}
    >
      {actionData.mensaje}
    </p>
  ) : null;

  const sePuedeVender = pieza.estado === "disponible" || pieza.estado === "reservada";

  return (
    <>
      <div className="pieza-cabecera">
        <div>
          <p className="pieza-cabecera-ref">
            <span>Ref.</span>
            {pieza.codigo}
          </p>
          <p className="pieza-cabecera-detalle">{pieza.nombre ?? "Sin nombre todavía"}</p>
          <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}`}>
            Editar pieza
          </Link>
        </div>
        <Sello texto={TEXTO_DEL_ESTADO[pieza.estado]} />
      </div>

      {venta ? (
        <>
          {mensaje}
          <BloqueNuncaSePublica titulo="Venta">
            <Renglones>
              <Renglon etiqueta="Compradora">{venta.compradora.nombre}</Renglon>
              <Renglon etiqueta="WhatsApp" cifra>
                <a href={enlaceWhatsApp(venta.compradora.whatsapp, `Hola ${venta.compradora.nombre}, te escribo por la Ref. ${venta.codigo}.`)}>
                  +{venta.compradora.whatsapp}
                </a>
              </Renglon>
              <Renglon etiqueta="Precio final" cifra>
                Bs {bolivianos(venta.precioFinalCentavos)}
              </Renglon>
              {venta.precioPublicadoCentavos !== null ? (
                <Renglon etiqueta="Precio publicado" cifra>
                  Bs {bolivianos(venta.precioPublicadoCentavos)}
                </Renglon>
              ) : null}
              <Renglon etiqueta="Fecha" cifra>
                {fechaDeBolivia(venta.vendidaEn)}
              </Renglon>
              <Renglon etiqueta="Canal">{TEXTO_DEL_CANAL[venta.canal]}</Renglon>
              <Renglon etiqueta="Origen">{venta.desdeReserva ? "Desde una reserva" : "Venta directa"}</Renglon>
            </Renglones>
          </BloqueNuncaSePublica>

          <BloquePanel titulo="Entrega" detalle={TEXTO_DEL_ESTADO_DE_ENTREGA[venta.entrega.estado]}>
            <Renglones>
              <Renglon etiqueta="Modalidad">{TEXTO_DE_LA_MODALIDAD[venta.entrega.modalidad]}</Renglon>
              <Renglon etiqueta="Costo" cifra>
                Bs {bolivianos(venta.entrega.costoCentavos)}
              </Renglon>
              {venta.entrega.guia ? <Renglon etiqueta="Guía">{venta.entrega.guia}</Renglon> : null}
              {venta.entrega.entregadaEn ? (
                <Renglon etiqueta="Entregada el" cifra>
                  {fechaDeBolivia(venta.entrega.entregadaEn)}
                </Renglon>
              ) : null}
            </Renglones>

            {venta.entrega.modalidad === "envio_departamento" ? (
              <Form method="post">
                <input type="hidden" name="intencion" value="guia" />
                <Campo etiqueta="Guía o comprobante del envío" para="guia">
                  <CampoTexto id="guia" name="guia" defaultValue={venta.entrega.guia ?? ""} autoComplete="off" />
                  <MensajeDeError
                    texto={actionData?.intencion === "guia" ? actionData.errores?.guia : undefined}
                  />
                </Campo>
                <button type="submit" className="btn btn-ancho" disabled={enviando}>
                  Guardar guía
                </button>
              </Form>
            ) : null}

            {venta.entrega.estado === "pendiente" ? (
              <Form method="post">
                <input type="hidden" name="intencion" value="entregada" />
                <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
                  Marcar entregada
                </button>
              </Form>
            ) : null}
          </BloquePanel>
        </>
      ) : sePuedeVender ? (
        <Form method="post">
          <input type="hidden" name="intencion" value="vender" />
          <BloqueNuncaSePublica titulo="Registrar venta">
            {reserva ? (
              <p className="panel-aviso" role="note">
                Reservada para <b>{reserva.compradora.nombre}</b> (+{reserva.compradora.whatsapp}):
                la venta cierra esa reserva.
              </p>
            ) : (
              <>
                <Campo etiqueta="Compradora" para="nombre" ayuda="Si el WhatsApp ya está registrado, se usa esa compradora.">
                  <CampoTexto id="nombre" name="nombre" autoComplete="off" aria-invalid={errores.nombre ? true : undefined} />
                  <MensajeDeError texto={errores.nombre ?? errores.compradora} />
                </Campo>
                <Campo etiqueta="WhatsApp" para="whatsapp">
                  <CampoTexto
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="7123 4567"
                    aria-invalid={errores.whatsapp ? true : undefined}
                  />
                  <MensajeDeError texto={errores.whatsapp} />
                </Campo>
              </>
            )}

            <Campo
              etiqueta="Precio final, en Bs"
              para="precioFinal"
              ayuda={pieza.precioCentavos ? `Publicado: Bs ${bolivianos(pieza.precioCentavos)}.` : undefined}
            >
              <CampoTexto
                id="precioFinal"
                name="precioFinal"
                inputMode="decimal"
                defaultValue={pieza.precioCentavos ? bolivianos(pieza.precioCentavos) : ""}
                aria-invalid={errores.precioFinalCentavos ? true : undefined}
              />
              <MensajeDeError texto={errores.precioFinalCentavos} />
            </Campo>

            <Campo etiqueta="Fecha de la venta" para="fecha">
              <CampoTexto id="fecha" name="fecha" type="date" defaultValue={hoy} max={hoy} aria-invalid={errores.fecha ? true : undefined} />
              <MensajeDeError texto={errores.fecha} />
            </Campo>

            <Campo etiqueta="Canal de captación" para="canal">
              <Seleccion id="canal" name="canal" defaultValue="" aria-invalid={errores.canal ? true : undefined}>
                <option value="" disabled>
                  ¿Por dónde llegó?
                </option>
                {Object.entries(TEXTO_DEL_CANAL).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </Seleccion>
              <MensajeDeError texto={errores.canal} />
            </Campo>

            <h3 className="grupo">Entrega</h3>
            <Campo etiqueta="Modalidad" para="modalidad">
              <Seleccion
                id="modalidad"
                name="modalidad"
                value={modalidad}
                onChange={(evento) => setModalidad(evento.target.value as ModalidadDeLaEntrega)}
              >
                {MODALIDADES.map((valor) => (
                  <option key={valor} value={valor}>
                    {TEXTO_DE_LA_MODALIDAD[valor]}
                  </option>
                ))}
              </Seleccion>
              <MensajeDeError texto={errores.modalidad} />
            </Campo>
            {modalidad !== "retiro" ? (
              <Campo etiqueta="Costo de la entrega, en Bs" para="costoEntrega" ayuda="Lo que le cuesta a la tienda. Vacío es 0.">
                <CampoTexto
                  id="costoEntrega"
                  name="costoEntrega"
                  inputMode="decimal"
                  aria-invalid={errores.costoCentavos ? true : undefined}
                />
                <MensajeDeError texto={errores.costoCentavos} />
              </Campo>
            ) : null}
            {modalidad === "envio_departamento" ? (
              <Campo etiqueta="Guía o comprobante" para="guia" ayuda="Puedes agregarla después.">
                <CampoTexto id="guia" name="guia" autoComplete="off" aria-invalid={errores.guia ? true : undefined} />
                <MensajeDeError texto={errores.guia} />
              </Campo>
            ) : null}
            <label className="casilla">
              <input type="checkbox" name="entregada" value="si" />
              <span>Ya está entregada</span>
            </label>

            <label className="casilla">
              <input
                type="checkbox"
                name="pagoVerificado"
                value="si"
                checked={pagoVerificado}
                onChange={(evento) => setPagoVerificado(evento.target.checked)}
              />
              <span>
                Vi el pago en la cuenta del banco
                <small>Una captura de pantalla no basta.</small>
              </span>
            </label>
            <MensajeDeError texto={errores.pagoVerificado} />

            {mensaje}
            {!pagoVerificado ? (
              <p className="acciones-motivo">Verifica el pago en el banco para registrar la venta.</p>
            ) : null}
            <button
              type="submit"
              className="btn btn-primario btn-ancho"
              disabled={!pagoVerificado || enviando}
            >
              Registrar venta de {pieza.codigo}
            </button>
          </BloqueNuncaSePublica>
        </Form>
      ) : (
        <BloquePanel titulo="Registrar venta">
          {mensaje}
          <p className="ayuda">
            Solo se vende una pieza Disponible o Reservada. Esta está{" "}
            {TEXTO_DEL_ESTADO[pieza.estado].toLowerCase()}.
          </p>
        </BloquePanel>
      )}

      {pieza.estado === "en_preparacion" || pieza.estado === "disponible" ? (
        <Link className="btn btn-ancho" to={`/admin/piezas/${pieza.codigo}/retiro`}>
          Retirar pieza
          <Icono nombre="adelante" />
        </Link>
      ) : null}
    </>
  );
}
