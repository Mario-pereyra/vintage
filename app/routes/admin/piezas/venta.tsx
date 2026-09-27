import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BarraAccionesPanel } from "~/componentes/barra-acciones";
import { BloqueNuncaSePublica, BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { Campo, CampoPrecio, CampoTexto } from "~/componentes/campos";
import { Chips } from "~/componentes/chips";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import { horaDeBolivia } from "~/componentes/hora";
import { Icono, type NombreIcono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { Total } from "~/componentes/total";
import { ErrorDeDominio, type CanalDeLaVenta, type ModalidadDeLaEntrega } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { hoyEnBolivia, leerVenta } from "~/servidor/formulario-de-venta.server";

import type { BarraDelPanel } from "../layout";
import {
  bolivianos,
  fechaCortaDeBolivia,
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

/** Nombres cortos para el control segmentado; el largo va debajo. */
const MODALIDADES: readonly { valor: ModalidadDeLaEntrega; texto: string }[] = [
  { valor: "retiro", texto: "Retiro" },
  { valor: "delivery_santa_cruz", texto: "Delivery" },
  { valor: "envio_departamento", texto: "Envío" },
];

const ICONO_DE_LA_MODALIDAD: Record<ModalidadDeLaEntrega, NombreIcono> = {
  retiro: "ubicacion",
  delivery_santa_cruz: "delivery",
  envio_departamento: "paquete",
};

const CANALES = Object.entries(TEXTO_DEL_CANAL).map(([valor, texto]) => ({
  valor: valor as CanalDeLaVenta,
  texto,
}));

/**
 * El precio final frente al publicado, calculado mientras se escribe: "Bs 30
 * menos que el publicado". Va en tinta azul, como todo lo calculado.
 */
function diferenciaConPublicado(escrito: string, publicadoCentavos: number | null) {
  if (!publicadoCentavos) return null;
  const limpio = escrito.trim().replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(limpio)) return null;
  const final = Math.round(Number(limpio) * 100);
  if (final <= 0) return null;
  const diferencia = publicadoCentavos - final;
  if (diferencia === 0) return "→ El precio publicado";
  return diferencia > 0
    ? `→ Bs ${bolivianos(diferencia)} menos que el publicado`
    : `→ Bs ${bolivianos(-diferencia)} más que el publicado`;
}

function whatsAppDe(persona: { nombre: string; whatsapp: string }, codigo: string) {
  return enlaceWhatsApp(
    persona.whatsapp,
    `Hola ${persona.nombre}, te escribo por la Ref. ${codigo}.`,
  );
}

export default function VentaDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, venta, reserva, hoy } = loaderData;
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const intencionEnviada = navegacion.formData?.get("intencion");
  const errores: Partial<Record<string, string>> =
    actionData?.intencion === "vender" ? (actionData.errores ?? {}) : {};

  const [precioFinal, setPrecioFinal] = useState(
    pieza.precioCentavos ? bolivianos(pieza.precioCentavos) : "",
  );
  const [canal, setCanal] = useState<CanalDeLaVenta | null>(null);
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
  const sePuedeRetirar = pieza.estado === "en_preparacion" || pieza.estado === "disponible";

  const cabecera = (
    <div className="pieza-cabecera">
      <div>
        <p className="pieza-cabecera-ref">
          <span>Ref.</span>
          {pieza.codigo}
        </p>
        <p className="pieza-cabecera-detalle">{pieza.nombre ?? "Sin nombre todavía"}</p>
        <Link className="enlace-ficha" to={`/admin/piezas/${pieza.codigo}`}>
          Editar pieza
          <Icono nombre="adelante" />
        </Link>
      </div>
      <Sello
        texto={TEXTO_DEL_ESTADO[pieza.estado]}
        detalle={
          venta
            ? `${fechaCortaDeBolivia(venta.vendidaEn)} · Bs ${bolivianos(venta.precioFinalCentavos)}`
            : reserva
              ? `hasta las ${horaDeBolivia(reserva.venceEn)}`
              : undefined
        }
      />
    </div>
  );

  // --- Ya vendida: la venta y su entrega ---------------------------------------
  if (venta) {
    const { entrega } = venta;
    const pendiente = entrega.estado === "pendiente";
    const esEnvio = entrega.modalidad === "envio_departamento";
    const rebaja =
      venta.precioPublicadoCentavos !== null &&
      venta.precioPublicadoCentavos !== venta.precioFinalCentavos;

    return (
      <>
        {cabecera}
        {actionData && actionData.intencion !== "guia" ? (
          <p
            className="panel-nota panel-nota-fuerte"
            role={actionData.errores ? "alert" : "status"}
          >
            {actionData.mensaje}
          </p>
        ) : null}

        <BloquePanel
          titulo="Entrega"
          detalle={TEXTO_DEL_ESTADO_DE_ENTREGA[entrega.estado]}
          completo={!pendiente}
        >
          <p className="venta-modalidad">
            <Icono nombre={ICONO_DE_LA_MODALIDAD[entrega.modalidad]} />
            <b>{TEXTO_DE_LA_MODALIDAD[entrega.modalidad]}</b>
          </p>
          <Renglones>
            <Renglon etiqueta="Costo" cifra aclaracion="lo paga la tienda">
              {entrega.costoCentavos > 0 ? `Bs ${bolivianos(entrega.costoCentavos)}` : "Sin costo"}
            </Renglon>
            {entrega.entregadaEn ? (
              <Renglon etiqueta="Entregada el" cifra>
                {fechaDeBolivia(entrega.entregadaEn)}
              </Renglon>
            ) : null}
          </Renglones>

          {esEnvio ? (
            <Form method="post" className="venta-guia">
              <input type="hidden" name="intencion" value="guia" />
              <label htmlFor="guia" className="etiqueta">
                Guía o comprobante del envío
              </label>
              {!entrega.guia ? (
                <p className="ayuda">
                  Falta la guía: pásasela a {venta.compradora.nombre} cuando la tengas.
                </p>
              ) : null}
              <div className="venta-guia-fila">
                <CampoTexto
                  id="guia"
                  name="guia"
                  defaultValue={entrega.guia ?? ""}
                  autoComplete="off"
                  aria-invalid={
                    actionData?.intencion === "guia" && actionData.errores?.guia ? true : undefined
                  }
                />
                <button type="submit" className="btn" disabled={enviando}>
                  Guardar
                </button>
              </div>
              <MensajeDeError
                texto={actionData?.intencion === "guia" ? actionData.errores?.guia : undefined}
              />
              {actionData?.intencion === "guia" && !actionData.errores ? (
                <p className="venta-guardado" role="status">
                  {actionData.mensaje}
                </p>
              ) : null}
            </Form>
          ) : null}

          {pendiente ? (
            <div className="venta-entregar">
              <a className="btn btn-ancho" href={whatsAppDe(venta.compradora, venta.codigo)}>
                <Icono nombre="chat" />
                Escribir a {venta.compradora.nombre}
              </a>
              <Form method="post">
                <input type="hidden" name="intencion" value="entregada" />
                <button
                  type="submit"
                  className="btn btn-primario btn-ancho"
                  disabled={enviando && intencionEnviada === "entregada"}
                >
                  Marcar entregada
                </button>
              </Form>
            </div>
          ) : null}
        </BloquePanel>

        <BloqueNuncaSePublica titulo="Venta">
          <Renglones>
            <Renglon
              etiqueta="Compradora"
              aclaracion={
                <a className="cifra" href={whatsAppDe(venta.compradora, venta.codigo)}>
                  +{venta.compradora.whatsapp}
                </a>
              }
            >
              {venta.compradora.nombre}
            </Renglon>
            <Renglon etiqueta="Fecha" cifra>
              {fechaDeBolivia(venta.vendidaEn)}
            </Renglon>
            <Renglon etiqueta="Canal">{TEXTO_DEL_CANAL[venta.canal]}</Renglon>
            <Renglon etiqueta="Origen">
              {venta.desdeReserva ? "Cerró una reserva" : "Venta directa"}
            </Renglon>
          </Renglones>
          <Total
            precio={venta.precioFinalCentavos / 100}
            precioAnterior={
              rebaja && venta.precioPublicadoCentavos !== null
                ? venta.precioPublicadoCentavos / 100
                : undefined
            }
          />
          <p className="ayuda venta-publico">
            La ficha pública sigue visible como vendida
            {venta.precioPublicadoCentavos !== null ? (
              <>
                {" "}
                con el precio publicado,{" "}
                <span className="cifra">Bs {bolivianos(venta.precioPublicadoCentavos)}</span>
              </>
            ) : null}
            .{" "}
            <a href={pieza.rutaPublica} className="enlace-ficha">
              Ver su ficha
              <Icono nombre="externo" />
            </a>
          </p>
        </BloqueNuncaSePublica>
      </>
    );
  }

  // --- No se puede vender ------------------------------------------------------
  if (!sePuedeVender) {
    return (
      <>
        {cabecera}
        <BloquePanel titulo="Registrar venta">
          {mensaje}
          <p className="ayuda">
            Solo se vende una pieza Disponible o Reservada. Esta está{" "}
            {TEXTO_DEL_ESTADO[pieza.estado].toLowerCase()}
            {pieza.estado === "en_preparacion" ? ": publícala primero." : "."}
          </p>
        </BloquePanel>
        {sePuedeRetirar ? <EnlaceRetiro codigo={pieza.codigo} /> : null}
      </>
    );
  }

  // --- Registrar la venta ------------------------------------------------------
  const diferencia = diferenciaConPublicado(precioFinal, pieza.precioCentavos);

  return (
    <Form method="post" className="venta">
      <input type="hidden" name="intencion" value="vender" />
      {cabecera}

      <BloquePanel titulo="Compradora">
        {reserva ? (
          <div className="compradora-elegida">
            <p>
              <b>{reserva.compradora.nombre}</b>
              <span className="cifra">+{reserva.compradora.whatsapp}</span>
            </p>
            <Link to={`/admin/piezas/${pieza.codigo}/reserva`} className="enlace-ficha">
              Ver reserva
            </Link>
          </div>
        ) : (
          <div className="anotar-campos">
            <Campo etiqueta="Nombre" para="nombre">
              <CampoTexto
                id="nombre"
                name="nombre"
                autoComplete="off"
                aria-invalid={errores.nombre || errores.compradora ? true : undefined}
              />
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
          </div>
        )}
        {reserva ? (
          <p className="ayuda">La venta cierra la reserva: no vence ni suma al contador.</p>
        ) : (
          <p className="ayuda">Si su WhatsApp ya está registrado, se usa esa compradora.</p>
        )}
      </BloquePanel>

      <BloqueNuncaSePublica titulo="Venta">
        <Campo
          etiqueta="Precio final"
          para="precioFinal"
          ayuda={
            pieza.precioCentavos ? (
              <>
                Lo que pagó. La ficha sigue mostrando el publicado,{" "}
                <span className="cifra">Bs {bolivianos(pieza.precioCentavos)}</span>.
              </>
            ) : undefined
          }
        >
          <CampoPrecio
            id="precioFinal"
            name="precioFinal"
            value={precioFinal}
            onChange={(evento) => setPrecioFinal(evento.target.value)}
            aria-invalid={errores.precioFinalCentavos ? true : undefined}
            aria-describedby="precio-diferencia"
          />
          <p className="derivado" id="precio-diferencia" aria-live="polite">
            {diferencia}
          </p>
          <MensajeDeError texto={errores.precioFinalCentavos} />
        </Campo>

        <Campo etiqueta="Canal de captación" idEtiqueta="canal-etiqueta" ayuda="¿Por dónde llegó?">
          <Chips
            etiquetadoPor="canal-etiqueta"
            opciones={CANALES}
            valor={canal}
            alCambiar={setCanal}
            name="canal"
          />
          <MensajeDeError texto={errores.canal} />
        </Campo>

        <Campo etiqueta="Fecha de la venta" para="fecha">
          <CampoTexto
            id="fecha"
            name="fecha"
            type="date"
            defaultValue={hoy}
            max={hoy}
            aria-invalid={errores.fecha ? true : undefined}
          />
          <MensajeDeError texto={errores.fecha} />
        </Campo>
      </BloqueNuncaSePublica>

      <BloquePanel titulo="Entrega">
        <Campo etiqueta="Modalidad" idEtiqueta="modalidad-etiqueta">
          <ControlSegmentado
            etiquetadoPor="modalidad-etiqueta"
            opciones={MODALIDADES}
            valor={modalidad}
            alCambiar={setModalidad}
            name="modalidad"
          />
          <p className="venta-modalidad venta-modalidad-elegida">
            <Icono nombre={ICONO_DE_LA_MODALIDAD[modalidad]} />
            {TEXTO_DE_LA_MODALIDAD[modalidad]}
          </p>
          <MensajeDeError texto={errores.modalidad} />
        </Campo>

        {modalidad !== "retiro" ? (
          <Campo
            etiqueta="Costo de la entrega"
            para="costoEntrega"
            ayuda="Lo que le cuesta a la tienda. Vacío es 0."
          >
            <label className="venta-costo">
              <b aria-hidden="true">Bs</b>
              <input
                id="costoEntrega"
                name="costoEntrega"
                inputMode="decimal"
                placeholder="0"
                autoComplete="off"
                aria-invalid={errores.costoCentavos ? true : undefined}
              />
            </label>
            <MensajeDeError texto={errores.costoCentavos} />
          </Campo>
        ) : null}

        {modalidad === "envio_departamento" ? (
          <Campo
            etiqueta="Guía o comprobante"
            para="guia"
            ayuda="Si todavía no la tienes, agrégala después."
          >
            <CampoTexto
              id="guia"
              name="guia"
              autoComplete="off"
              aria-invalid={errores.guia ? true : undefined}
            />
            <MensajeDeError texto={errores.guia} />
          </Campo>
        ) : null}

        <label className="casilla">
          <input type="checkbox" name="entregada" value="si" />
          <span>
            Ya está entregada
            <small>Si no, queda en Entregas pendientes.</small>
          </span>
        </label>
      </BloquePanel>

      <section className="bloque venta-pago" aria-label="Pago">
        {mensaje}
        <label className="casilla venta-pago-casilla">
          <input
            type="checkbox"
            name="pagoVerificado"
            value="si"
            checked={pagoVerificado}
            onChange={(evento) => setPagoVerificado(evento.target.checked)}
          />
          <span>
            Vi el pago en la cuenta del banco
            <small>Una captura de pantalla no basta: sin el pago verificado no hay venta.</small>
          </span>
        </label>
        <MensajeDeError texto={errores.pagoVerificado} />
      </section>

      <BarraAccionesPanel
        motivo={
          !pagoVerificado ? "Verifica el pago en el banco para registrar la venta." : undefined
        }
        publicar={{
          texto: enviando ? "Registrando…" : `Registrar venta de ${pieza.codigo}`,
          disabled: !pagoVerificado || enviando,
        }}
      />
    </Form>
  );
}

function EnlaceRetiro({ codigo }: { codigo: string }) {
  return (
    <Link className="btn btn-ancho" to={`/admin/piezas/${codigo}/retiro`}>
      Retirar pieza
      <Icono nombre="adelante" />
    </Link>
  );
}
