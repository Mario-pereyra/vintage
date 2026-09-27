import { useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BarraAccionesPanel } from "~/componentes/barra-acciones";
import { BloqueNuncaSePublica, BloquePanel } from "~/componentes/bloque-panel";
import { AreaTexto, Campo } from "~/componentes/campos";
import { Chips } from "~/componentes/chips";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import type { MotivoDelRetiro } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";
import { leerRetiro } from "~/servidor/formulario-de-venta.server";

import type { BarraDelPanel } from "../layout";
import { fechaCortaDeBolivia, fechaDeBolivia, TEXTO_DEL_MOTIVO } from "../textos-de-venta";
import type { Route } from "./+types/retiro";
import { TEXTO_DEL_ESTADO } from "./formulario-de-pieza";

export const handle = {
  titulo: "Retirar pieza",
  volverA: "/admin/piezas",
} satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const pieza = await dominio.piezaDelPanel(params.codigo);
  if (!pieza) throw data(null, { status: 404 });
  return { pieza, retiro: await dominio.retiroDePieza(pieza.codigo) };
}

export async function action({ params, request, context }: Route.ActionArgs) {
  try {
    await obtenerDominio(context).retirarPieza(params.codigo, leerRetiro(await request.formData()));
    return { mensaje: "Pieza retirada: salió del catálogo." };
  } catch (error) {
    return respuestaDeRechazo(error);
  }
}

const MOTIVOS = Object.entries(TEXTO_DEL_MOTIVO).map(([valor, texto]) => ({
  valor: valor as MotivoDelRetiro,
  texto,
}));

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="campo-error" role="alert">
      {texto}
    </p>
  ) : null;
}

export default function RetiroDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, retiro } = loaderData;
  const enviando = useNavigation().state === "submitting";
  const errores: Partial<Record<string, string>> =
    actionData && "errores" in actionData ? actionData.errores : {};
  const sePuedeRetirar = pieza.estado === "en_preparacion" || pieza.estado === "disponible";

  const [motivo, setMotivo] = useState<MotivoDelRetiro | null>(null);
  const [nota, setNota] = useState("");
  const faltaNota = motivo === "otro" && !nota.trim();

  const aviso = actionData ? (
    <p
      className={"errores" in actionData ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
      role={"errores" in actionData ? "alert" : "status"}
    >
      {actionData.mensaje}
    </p>
  ) : null;

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
        detalle={retiro ? fechaCortaDeBolivia(retiro.retiradaEn) : undefined}
      />
    </div>
  );

  if (retiro) {
    return (
      <>
        {cabecera}
        {actionData ? (
          <p className="panel-nota panel-nota-fuerte" role="status">
            {actionData.mensaje}
          </p>
        ) : null}
        <BloqueNuncaSePublica titulo="Retiro">
          <Renglones>
            <Renglon etiqueta="Motivo">{TEXTO_DEL_MOTIVO[retiro.motivo]}</Renglon>
            {retiro.nota ? (
              <Renglon etiqueta="Nota" nota>
                {retiro.nota}
              </Renglon>
            ) : null}
            <Renglon etiqueta="Fecha" cifra>
              {fechaDeBolivia(retiro.retiradaEn)}
            </Renglon>
          </Renglones>
          <p className="ayuda retiro-final">
            Retirada es un estado final.{" "}
            {pieza.publicadaEn ? (
              <>
                Su ficha pública dice «Ya no disponible».{" "}
                <a href={pieza.rutaPublica} className="enlace-ficha">
                  Ver su ficha
                  <Icono nombre="externo" />
                </a>
              </>
            ) : (
              "Nunca se publicó: no tiene ficha pública."
            )}
          </p>
        </BloqueNuncaSePublica>
      </>
    );
  }

  if (!sePuedeRetirar) {
    return (
      <>
        {cabecera}
        {aviso}
        <BloquePanel titulo="Retirar del catálogo">
          <p className="ayuda">
            Solo se retira una pieza En preparación o Disponible. Esta está{" "}
            {TEXTO_DEL_ESTADO[pieza.estado].toLowerCase()}
            {pieza.estado === "reservada" ? ": cancela antes la reserva." : "."}
          </p>
          {pieza.estado === "reservada" ? (
            <Link className="btn btn-ancho retiro-ir" to={`/admin/piezas/${pieza.codigo}/reserva`}>
              Ir a la reserva
              <Icono nombre="adelante" />
            </Link>
          ) : null}
        </BloquePanel>
      </>
    );
  }

  const motivoDeshabilitado = !motivo
    ? "Elige el motivo para retirar la pieza."
    : faltaNota
      ? "Con «Otro», escribe el motivo en la nota."
      : undefined;

  return (
    <Form method="post">
      {cabecera}

      <BloqueNuncaSePublica titulo="Retirar del catálogo">
        <Campo etiqueta="Motivo" idEtiqueta="motivo-etiqueta">
          <Chips
            etiquetadoPor="motivo-etiqueta"
            opciones={MOTIVOS}
            valor={motivo}
            alCambiar={setMotivo}
            name="motivo"
          />
          <MensajeDeError texto={errores.motivo} />
        </Campo>
        <Campo
          etiqueta={motivo === "otro" ? "Nota" : "Nota (opcional)"}
          para="nota"
          ayuda={motivo === "otro" ? "Cuenta por qué sale del catálogo." : undefined}
        >
          <AreaTexto
            id="nota"
            name="nota"
            maxLength={280}
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            aria-invalid={errores.nota ? true : undefined}
          />
          <MensajeDeError texto={errores.nota} />
        </Campo>
      </BloqueNuncaSePublica>

      <section className="bloque retiro-aviso" aria-label="Qué pasa al retirarla">
        {aviso}
        <p>
          <b>Retirada es un estado final.</b> La pieza sale del catálogo y no se puede volver a
          publicar, reservar ni vender.
        </p>
        {pieza.publicadaEn ? (
          <p className="ayuda">Su enlace sigue funcionando y dice «Ya no disponible».</p>
        ) : null}
      </section>

      <BarraAccionesPanel
        motivo={motivoDeshabilitado}
        publicar={{
          texto: enviando ? "Retirando…" : `Retirar ${pieza.codigo}`,
          disabled: Boolean(motivoDeshabilitado) || enviando,
        }}
      />
    </Form>
  );
}
