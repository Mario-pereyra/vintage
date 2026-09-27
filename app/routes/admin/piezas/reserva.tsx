import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { Campo, CampoTexto } from "~/componentes/campos";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import { horaDeBolivia } from "~/componentes/hora";
import { Icono } from "~/componentes/icono";
import { MarcaVencidas } from "~/componentes/marca-vencidas";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { TiempoRestante, useRefrescarCada } from "~/componentes/tiempo-restante";
import {
  ErrorDeDominio,
  PLAZO_POR_DEFECTO,
  type Compradora,
  type OrigenDeLaReserva,
  type ReglaDeCompradora,
} from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import {
  leerInteresada,
  leerMinutos,
  leerReserva,
} from "~/servidor/formulario-de-reserva.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/reserva";
import { TEXTO_DEL_ESTADO } from "./formulario-de-pieza";

export const handle = {
  titulo: "Reserva",
  volverA: "/admin/reservas",
} satisfies BarraDelPanel;

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const pieza = await dominio.piezaDelPanel(params.codigo);
  if (!pieza) throw data(null, { status: 404 });

  const busqueda = new URL(request.url).searchParams;
  const q = busqueda.get("q");
  const elegidaId = busqueda.get("compradora");

  const [reserva, interesadas, encontradas, elegida] = await Promise.all([
    dominio.reservaActiva(pieza.codigo),
    dominio.interesadasDePieza(pieza.codigo),
    q !== null ? dominio.buscarCompradoras(q) : null,
    elegidaId ? dominio.compradora(elegidaId) : null,
  ]);
  return { pieza, reserva, interesadas, q, encontradas, elegida };
}

type Intencion = "reservar" | "extender" | "cancelar" | "interesada";

/** Qué formulario respondió y qué pasó: `errores` va solo a ese formulario. */
type Resultado = {
  intencion: Intencion;
  mensaje: string;
  errores?: Record<string, string>;
};

export async function action({ params, request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const formulario = await request.formData();
  const intencion = String(formulario.get("intencion")) as Intencion;
  try {
    return await ejecutar(intencion);
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return data<Resultado>(
      { intencion, mensaje: error.message, errores: { ...error.errores } },
      { status: 400 },
    );
  }

  async function ejecutar(intencion: Intencion): Promise<Resultado> {
    switch (intencion) {
      case "reservar": {
        const { reserva, aviso } = await dominio.reservar(
          leerReserva(params.codigo, formulario),
        );
        const hecho = `Reservada hasta las ${horaDeBolivia(reserva.venceEn)}.`;
        return {
          intencion,
          mensaje: aviso ? `${hecho} ${AVISO_DE_REGLA[aviso](reserva.compradora)}` : hecho,
        };
      }
      case "extender": {
        const reserva = await dominio.extenderReserva(
          params.codigo,
          leerMinutos(formulario.get("minutos")) ?? Number.NaN,
        );
        return {
          intencion,
          mensaje: `Extendida hasta las ${horaDeBolivia(reserva.venceEn)}.`,
        };
      }
      case "cancelar":
        await dominio.cancelarReserva(params.codigo);
        return {
          intencion,
          mensaje: "Reserva cancelada: la pieza vuelve a estar Disponible.",
        };
      case "interesada":
        await dominio.registrarInteresada(params.codigo, leerInteresada(formulario));
        return { intencion, mensaje: "Interesada registrada." };
      default:
        throw data(null, { status: 400 });
    }
  }
}

/** Qué se le dice a la operadora según las reservas vencidas de la compradora. */
const AVISO_DE_REGLA: Record<ReglaDeCompradora, (c: Compradora) => string> = {
  libre: () => "",
  aviso: (c) => `${c.nombre} ya dejó vencer 1 reserva. Puedes reservarle; avísale del plazo.`,
  pago_previo: (c) =>
    `${c.nombre} dejó vencer 2 reservas: solo se le reserva si paga antes.`,
  bloqueada: (c) =>
    `${c.nombre} dejó vencer ${c.reservasVencidas} reservas: ya no se le reserva.`,
};

/** Minutos de los botones de extender. */
const EXTENSIONES = [5, 15, 30, 60] as const;

const ORIGENES = [
  { valor: "live", texto: `En un live · ${PLAZO_POR_DEFECTO.live} min` },
  { valor: "fuera_de_live", texto: `Fuera de live · ${PLAZO_POR_DEFECTO.fuera_de_live / 60} h` },
] as const satisfies readonly { valor: OrigenDeLaReserva; texto: string }[];

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="campo-error" role="alert">
      {texto}
    </p>
  ) : null;
}

/** "Hola Ana, te escribo por la Ref. VT-0142." */
function whatsAppDe(persona: { nombre: string; whatsapp: string }, codigo: string) {
  return enlaceWhatsApp(
    persona.whatsapp,
    `Hola ${persona.nombre}, te escribo por la Ref. ${codigo}.`,
  );
}


export default function ReservaDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, reserva, interesadas, q, encontradas, elegida } = loaderData;
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const intencionEnviada = navegacion.formData?.get("intencion");

  const erroresDe = (intencion: Intencion): Partial<Record<string, string>> =>
    actionData?.intencion === intencion ? (actionData.errores ?? {}) : {};
  const mensajeDe = (intencion: Intencion) =>
    actionData?.intencion === intencion ? (
      <p
        className={actionData.errores ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
        role={actionData.errores ? "alert" : "status"}
      >
        {actionData.mensaje}
      </p>
    ) : null;

  const deReserva = erroresDe("reservar");
  const deInteresada = erroresDe("interesada");

  const [origen, setOrigen] = useState<OrigenDeLaReserva>("live");
  const [pagoPrevio, setPagoPrevio] = useState(false);

  const regla = elegida?.regla ?? "libre";
  const motivo =
    regla === "bloqueada" && elegida
      ? AVISO_DE_REGLA.bloqueada(elegida)
      : regla === "pago_previo" && !pagoPrevio
        ? "Marca que ya pagó para poder reservar."
        : null;

  // Una búsqueda sin resultados deja escrito lo buscado en el alta.
  const buscado = q?.trim() ?? "";
  const buscoNumero = /^[\d\s+()-]+$/.test(buscado);

  useRefrescarCada(30, Boolean(reserva));

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
        <Sello
          texto={TEXTO_DEL_ESTADO[pieza.estado]}
          detalle={reserva ? `hasta las ${horaDeBolivia(reserva.venceEn)}` : undefined}
        />
      </div>

      {actionData?.intencion === "cancelar" ? (
        <p className="panel-nota panel-nota-fuerte" role="status">
          {actionData.mensaje}
        </p>
      ) : null}

      {reserva ? (
        <BloquePanel titulo="Reserva activa">
          {mensajeDe("reservar")}
          <TiempoRestante
            minutos={reserva.minutosRestantes}
            venceEn={reserva.venceEn}
            grande
          />
          <Renglones>
            <Renglon etiqueta="Compradora">
              {reserva.compradora.nombre}{" "}
              <MarcaVencidas cantidad={reserva.compradora.reservasVencidas} />
            </Renglon>
            <Renglon etiqueta="WhatsApp" cifra>
              +{reserva.compradora.whatsapp}
            </Renglon>
            <Renglon etiqueta="Origen">
              {reserva.origen === "live" ? "En un live" : "Fuera de live"}
            </Renglon>
            {reserva.conPagoPrevio ? (
              <Renglon etiqueta="Pago">Pagó antes de reservar</Renglon>
            ) : null}
          </Renglones>

          <a className="btn btn-primario btn-ancho reserva-escribir" href={whatsAppDe(reserva.compradora, pieza.codigo)}>
            <Icono nombre="chat" />
            Escribir a {reserva.compradora.nombre}
          </a>

          <Link className="btn btn-ancho" to={`/admin/piezas/${pieza.codigo}/venta`}>
            Pagó: registrar venta
            <Icono nombre="adelante" />
          </Link>

          <Form method="post" className="extender">
            <input type="hidden" name="intencion" value="extender" />
            <h3 className="grupo" id="extender">
              Extender
            </h3>
            <div className="extender-opciones" role="group" aria-labelledby="extender">
              {EXTENSIONES.map((minutos) => (
                <button
                  key={minutos}
                  type="submit"
                  name="minutos"
                  value={minutos}
                  className="btn"
                  disabled={enviando}
                  aria-label={`Extender ${minutos} minutos`}
                >
                  <span className="cifra">+{minutos}</span>
                  <span className="extender-unidad">min</span>
                </button>
              ))}
            </div>
            {mensajeDe("extender")}
          </Form>

          <details className="cancelar">
            <summary className="btn btn-ancho">Cancelar reserva</summary>
            <Form method="post" className="cancelar-confirmar">
              <input type="hidden" name="intencion" value="cancelar" />
              <p className="ayuda">
                La pieza vuelve a estar Disponible. No suma al contador de vencidas de{" "}
                {reserva.compradora.nombre}.
              </p>
              <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
                Sí, cancelar la reserva
              </button>
            </Form>
          </details>
        </BloquePanel>
      ) : pieza.estado === "disponible" ? (
        <BloquePanel titulo="Reservar">
          <h3 className="grupo">Compradora</h3>
          {elegida ? (
            <div className="compradora-elegida">
              <p>
                <b>{elegida.nombre}</b>
                <span className="cifra">+{elegida.whatsapp}</span>
                <MarcaVencidas cantidad={elegida.reservasVencidas} />
              </p>
              <Link to="." className="enlace-ficha">
                Cambiar
              </Link>
            </div>
          ) : (
            <>
              <Form method="get" role="search" className="buscar-compradora">
                <label htmlFor="q" className="etiqueta">
                  Buscar por nombre o WhatsApp
                </label>
                <div className="buscar-compradora-fila">
                  <CampoTexto
                    id="q"
                    name="q"
                    type="search"
                    defaultValue={q ?? ""}
                    autoComplete="off"
                    enterKeyHint="search"
                  />
                  <button type="submit" className="btn btn-icono" aria-label="Buscar">
                    <Icono nombre="buscar" />
                  </button>
                </div>
              </Form>
              {encontradas ? (
                encontradas.length > 0 ? (
                  <ul className="compradoras">
                    {encontradas.map((c) => (
                      <li key={c.id}>
                        <Link className="compradora-fila" to={`?compradora=${c.id}`}>
                          <span>
                            <b>{c.nombre}</b>
                            <span className="cifra">+{c.whatsapp}</span>
                          </span>
                          <span className="compradora-fila-derecha">
                            <MarcaVencidas cantidad={c.reservasVencidas} />
                            <Icono nombre="adelante" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ayuda">
                    Nadie registrada con «{buscado}». Anótala abajo.
                  </p>
                )
              ) : null}
            </>
          )}

          <Form method="post" className="reservar">
            <input type="hidden" name="intencion" value="reservar" />
            {elegida ? (
              <>
                <input type="hidden" name="compradoraId" value={elegida.id} />
                {regla !== "libre" ? (
                  <p
                    className={
                      regla === "aviso" ? "panel-aviso" : "panel-aviso panel-aviso-fuerte"
                    }
                    role="note"
                  >
                    {AVISO_DE_REGLA[regla](elegida)}
                  </p>
                ) : null}
              </>
            ) : (
              <div className="compradora-nueva">
                <p className="ayuda">
                  {encontradas ? "O una compradora nueva:" : "Si es nueva, anótala aquí:"}
                </p>
                <Campo etiqueta="Nombre" para="nombre">
                  <CampoTexto
                    id="nombre"
                    name="nombre"
                    autoComplete="off"
                    defaultValue={encontradas?.length === 0 && !buscoNumero ? buscado : undefined}
                    aria-invalid={deReserva.nombre ? true : undefined}
                  />
                  <MensajeDeError texto={deReserva.nombre} />
                </Campo>
                <Campo
                  etiqueta="WhatsApp"
                  para="whatsapp"
                  ayuda="Si el número ya está registrado, se usa esa compradora."
                >
                  <CampoTexto
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="7123 4567"
                    defaultValue={encontradas?.length === 0 && buscoNumero ? buscado : undefined}
                    aria-invalid={deReserva.whatsapp ? true : undefined}
                  />
                  <MensajeDeError texto={deReserva.whatsapp} />
                </Campo>
              </div>
            )}

            <h3 className="grupo" id="plazo">
              Plazo
            </h3>
            <Campo etiqueta="¿Nace en un live?" idEtiqueta="origen">
              <ControlSegmentado
                etiquetadoPor="origen"
                opciones={ORIGENES}
                valor={origen}
                alCambiar={setOrigen}
                name="origen"
              />
              <MensajeDeError texto={deReserva.origen} />
            </Campo>
            <Campo
              etiqueta="Otro plazo, en minutos"
              para="plazoMinutos"
              ayuda="Déjalo vacío para usar el del origen."
            >
              <CampoTexto
                id="plazoMinutos"
                name="plazoMinutos"
                inputMode="numeric"
                placeholder={String(PLAZO_POR_DEFECTO[origen])}
                aria-invalid={deReserva.plazoMinutos ? true : undefined}
              />
              <MensajeDeError texto={deReserva.plazoMinutos} />
            </Campo>

            {regla !== "bloqueada" ? (
              <label className="casilla">
                <input
                  type="checkbox"
                  name="pagoPrevio"
                  value="si"
                  checked={pagoPrevio}
                  onChange={(evento) => setPagoPrevio(evento.target.checked)}
                />
                <span>
                  Ya pagó por adelantado
                  <small>
                    {regla === "pago_previo"
                      ? "Obligatorio: tiene 2 reservas vencidas."
                      : "Obligatorio con 2 reservas vencidas."}
                  </small>
                </span>
              </label>
            ) : null}
            <MensajeDeError texto={deReserva.pagoPrevio} />

            {mensajeDe("reservar")}
            {motivo ? <p className="acciones-motivo">{motivo}</p> : null}
            <button
              type="submit"
              className="btn btn-primario btn-ancho reservar-enviar"
              disabled={Boolean(motivo) || (enviando && intencionEnviada === "reservar")}
            >
              Reservar {pieza.codigo}
            </button>
          </Form>
        </BloquePanel>
      ) : (
        <BloquePanel titulo="Reservar">
          <p className="ayuda">
            Solo se reserva una pieza Disponible. Esta está{" "}
            {TEXTO_DEL_ESTADO[pieza.estado].toLowerCase()}.
          </p>
        </BloquePanel>
      )}

      <BloquePanel titulo="Interesadas" detalle={`${interesadas.length}`}>
        {interesadas.length > 0 ? (
          <>
            {pieza.estado === "disponible" ? (
              <p className="panel-aviso">La pieza está Disponible: escríbeles.</p>
            ) : null}
            <ul className="interesadas">
              {interesadas.map((i) => (
                <li key={i.id} className="interesada">
                  <span>
                    <b>{i.nombre}</b>
                    <span className="cifra">+{i.whatsapp}</span>
                    {i.nota ? <span className="interesada-nota">{i.nota}</span> : null}
                  </span>
                  <a
                    className="btn btn-icono"
                    href={whatsAppDe(i, pieza.codigo)}
                    aria-label={`Escribir a ${i.nombre} por WhatsApp`}
                  >
                    <Icono nombre="chat" />
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="ayuda">
            Nadie anotada todavía. Anota a quien pida la pieza mientras está reservada.
          </p>
        )}

        <Form method="post" className="anotar" key={interesadas.length}>
          <input type="hidden" name="intencion" value="interesada" />
          <h3 className="grupo">Anotar interesada</h3>
          <div className="anotar-campos">
            <Campo etiqueta="Nombre" para="interesada-nombre">
              <CampoTexto
                id="interesada-nombre"
                name="nombre"
                autoComplete="off"
                aria-invalid={deInteresada.nombre ? true : undefined}
              />
              <MensajeDeError texto={deInteresada.nombre} />
            </Campo>
            <Campo etiqueta="WhatsApp" para="interesada-whatsapp">
              <CampoTexto
                id="interesada-whatsapp"
                name="whatsapp"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="7123 4567"
                aria-invalid={deInteresada.whatsapp ? true : undefined}
              />
              <MensajeDeError texto={deInteresada.whatsapp} />
            </Campo>
          </div>
          <Campo etiqueta="Nota" para="interesada-nota">
            <CampoTexto
              id="interesada-nota"
              name="nota"
              autoComplete="off"
              placeholder="Comentó «mía» en el live"
              aria-invalid={deInteresada.nota ? true : undefined}
            />
            <MensajeDeError texto={deInteresada.nota} />
          </Campo>
          {mensajeDe("interesada")}
          <button
            type="submit"
            className="btn btn-ancho"
            disabled={enviando && intencionEnviada === "interesada"}
          >
            <Icono nombre="mas" />
            Anotar interesada
          </button>
        </Form>
      </BloquePanel>
    </>
  );
}
