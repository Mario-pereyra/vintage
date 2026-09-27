import { data, Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { AreaTexto, Campo, CampoTexto } from "~/componentes/campos";
import { horaDeBolivia, tiempoRestante } from "~/componentes/hora";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import {
  ErrorDeDominio,
  PLAZO_POR_DEFECTO,
  type Compradora,
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
  titulo: "Reserva e interesadas",
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
  aviso: (c) => `Ojo: ${c.nombre} ya dejó vencer 1 reserva.`,
  pago_previo: (c) => `${c.nombre} dejó vencer 2 reservas: debe pagar antes de reservar.`,
  bloqueada: (c) =>
    `${c.nombre} dejó vencer ${c.reservasVencidas} reservas: ya no se le reserva.`,
};

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="campo-error" role="alert">
      {texto}
    </p>
  ) : null;
}

export default function ReservaDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, reserva, interesadas, q, encontradas, elegida } = loaderData;
  const erroresDe = (intencion: Intencion): Partial<Record<string, string>> =>
    actionData?.intencion === intencion ? (actionData.errores ?? {}) : {};
  const mensajeDe = (intencion: Intencion) =>
    actionData?.intencion === intencion ? (
      <p className={actionData.errores ? "campo-error" : "ayuda"} role="status">
        {actionData.mensaje}
      </p>
    ) : null;

  const deReserva = erroresDe("reservar");
  const deExtension = erroresDe("extender");
  const deInteresada = erroresDe("interesada");

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

      {mensajeDe("cancelar")}

      {reserva ? (
        <BloquePanel
          titulo="Reserva activa"
          detalle={`quedan ${tiempoRestante(reserva.minutosRestantes)}`}
        >
          {mensajeDe("reservar")}
          <Renglones>
            <Renglon etiqueta="Compradora">{reserva.compradora.nombre}</Renglon>
            <Renglon etiqueta="WhatsApp" cifra>
              <a
                href={enlaceWhatsApp(
                  reserva.compradora.whatsapp,
                  `Hola ${reserva.compradora.nombre}, te escribo por la Ref. ${pieza.codigo}.`,
                )}
              >
                +{reserva.compradora.whatsapp}
              </a>
            </Renglon>
            <Renglon etiqueta="Vence" cifra>
              {horaDeBolivia(reserva.venceEn)}
            </Renglon>
            <Renglon etiqueta="Origen">
              {reserva.origen === "live" ? "Live" : "Fuera de un live"}
            </Renglon>
            {reserva.conPagoPrevio ? <Renglon etiqueta="Pago">Con pago previo</Renglon> : null}
            <Renglon etiqueta="Vencidas" cifra>
              {reserva.compradora.reservasVencidas}
            </Renglon>
          </Renglones>

          <Form method="post">
            <input type="hidden" name="intencion" value="extender" />
            <Campo etiqueta="Extender (minutos)" para="minutos">
              <CampoTexto id="minutos" name="minutos" inputMode="numeric" defaultValue="15" />
              <MensajeDeError texto={deExtension.minutos} />
            </Campo>
            {mensajeDe("extender")}
            <button type="submit" className="btn btn-ancho">
              Extender
            </button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intencion" value="cancelar" />
            <button type="submit" className="btn btn-ancho">
              Cancelar reserva
            </button>
          </Form>
        </BloquePanel>
      ) : pieza.estado === "disponible" ? (
        <BloquePanel titulo="Reservar">
          <Form method="get" role="search">
            {elegida ? <input type="hidden" name="compradora" value={elegida.id} /> : null}
            <Campo etiqueta="Buscar compradora" para="q" ayuda="Por nombre o WhatsApp.">
              <CampoTexto id="q" name="q" type="search" defaultValue={q ?? ""} />
            </Campo>
            <button type="submit" className="btn btn-ancho">
              Buscar
            </button>
          </Form>
          {encontradas ? (
            encontradas.length > 0 ? (
              <ul>
                {encontradas.map((c) => (
                  <li key={c.id}>
                    <Link to={`?compradora=${c.id}`}>
                      {c.nombre} · +{c.whatsapp}
                      {c.reservasVencidas > 0 ? ` · ${c.reservasVencidas} vencidas` : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ayuda">Nadie con ese nombre o WhatsApp: regístrala abajo.</p>
            )
          ) : null}

          <Form method="post">
            <input type="hidden" name="intencion" value="reservar" />
            {elegida ? (
              <>
                <input type="hidden" name="compradoraId" value={elegida.id} />
                <p>
                  Para <b>{elegida.nombre}</b> (+{elegida.whatsapp}).{" "}
                  <Link to=".">Otra compradora</Link>
                </p>
                {elegida.regla !== "libre" ? (
                  <p className="campo-error">{AVISO_DE_REGLA[elegida.regla](elegida)}</p>
                ) : null}
              </>
            ) : (
              <>
                <Campo etiqueta="Nombre de la compradora" para="nombre">
                  <CampoTexto id="nombre" name="nombre" autoComplete="off" />
                  <MensajeDeError texto={deReserva.nombre} />
                </Campo>
                <Campo
                  etiqueta="WhatsApp"
                  para="whatsapp"
                  ayuda="Si ya está registrada, se usa la misma compradora."
                >
                  <CampoTexto id="whatsapp" name="whatsapp" inputMode="tel" autoComplete="off" />
                  <MensajeDeError texto={deReserva.whatsapp} />
                </Campo>
              </>
            )}

            <fieldset className="campo">
              <legend className="etiqueta">¿Nace de un live?</legend>
              <label>
                <input type="radio" name="origen" value="live" defaultChecked /> Sí (
                {PLAZO_POR_DEFECTO.live} min)
              </label>{" "}
              <label>
                <input type="radio" name="origen" value="fuera_de_live" /> No (
                {PLAZO_POR_DEFECTO.fuera_de_live / 60} horas)
              </label>
              <MensajeDeError texto={deReserva.origen} />
            </fieldset>

            <Campo
              etiqueta="Plazo (minutos)"
              para="plazoMinutos"
              ayuda="Vacío: el plazo por defecto del origen."
            >
              <CampoTexto id="plazoMinutos" name="plazoMinutos" inputMode="numeric" />
              <MensajeDeError texto={deReserva.plazoMinutos} />
            </Campo>

            <label className="campo">
              <input type="checkbox" name="pagoPrevio" value="si" /> Ya pagó por adelantado
              (obligatorio con 2 reservas vencidas)
            </label>

            {mensajeDe("reservar")}
            <button type="submit" className="btn btn-primario btn-ancho">
              Reservar
            </button>
          </Form>
        </BloquePanel>
      ) : (
        <BloquePanel titulo="Reservar">
          <p className="ayuda">Solo se reserva una pieza Disponible.</p>
        </BloquePanel>
      )}

      <BloquePanel titulo="Interesadas" detalle={`${interesadas.length}`}>
        {interesadas.length > 0 ? (
          <>
            {pieza.estado === "disponible" ? (
              <p className="ayuda">La pieza está Disponible: escríbeles.</p>
            ) : null}
            <Renglones>
              {interesadas.map((i) => (
                <Renglon key={i.id} etiqueta={i.nombre} aclaracion={i.nota ?? undefined}>
                  <a
                    href={enlaceWhatsApp(
                      i.whatsapp,
                      `Hola ${i.nombre}, te escribo por la Ref. ${pieza.codigo}.`,
                    )}
                  >
                    +{i.whatsapp}
                  </a>
                </Renglon>
              ))}
            </Renglones>
          </>
        ) : (
          <p className="ayuda">Nadie registrado todavía.</p>
        )}

        <Form method="post">
          <input type="hidden" name="intencion" value="interesada" />
          <Campo etiqueta="Nombre" para="interesada-nombre">
            <CampoTexto id="interesada-nombre" name="nombre" autoComplete="off" />
            <MensajeDeError texto={deInteresada.nombre} />
          </Campo>
          <Campo etiqueta="WhatsApp" para="interesada-whatsapp">
            <CampoTexto
              id="interesada-whatsapp"
              name="whatsapp"
              inputMode="tel"
              autoComplete="off"
            />
            <MensajeDeError texto={deInteresada.whatsapp} />
          </Campo>
          <Campo etiqueta="Nota" para="interesada-nota">
            <AreaTexto id="interesada-nota" name="nota" placeholder="Comentó «mía» en el live" />
            <MensajeDeError texto={deInteresada.nota} />
          </Campo>
          {mensajeDe("interesada")}
          <button type="submit" className="btn btn-ancho">
            Registrar interesada
          </button>
        </Form>
      </BloquePanel>
    </>
  );
}
