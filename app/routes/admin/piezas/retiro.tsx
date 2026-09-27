import { data, Form, Link, useNavigation } from "react-router";

import { BloqueNuncaSePublica, BloquePanel } from "~/componentes/bloque-panel";
import { AreaTexto, Campo, Seleccion } from "~/componentes/campos";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { obtenerDominio } from "~/servidor/contexto.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";
import { leerRetiro } from "~/servidor/formulario-de-venta.server";

import type { BarraDelPanel } from "../layout";
import { fechaDeBolivia, TEXTO_DEL_MOTIVO } from "../textos-de-venta";
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

export default function RetiroDePieza({ loaderData, actionData }: Route.ComponentProps) {
  const { pieza, retiro } = loaderData;
  const enviando = useNavigation().state === "submitting";
  const errores: Partial<Record<string, string>> =
    actionData && "errores" in actionData ? actionData.errores : {};
  const sePuedeRetirar = pieza.estado === "en_preparacion" || pieza.estado === "disponible";

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

      {actionData ? (
        <p
          className={"errores" in actionData ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
          role={"errores" in actionData ? "alert" : "status"}
        >
          {actionData.mensaje}
        </p>
      ) : null}

      {retiro ? (
        <BloqueNuncaSePublica titulo="Retiro">
          <Renglones>
            <Renglon etiqueta="Motivo">{TEXTO_DEL_MOTIVO[retiro.motivo]}</Renglon>
            {retiro.nota ? <Renglon etiqueta="Nota">{retiro.nota}</Renglon> : null}
            <Renglon etiqueta="Fecha" cifra>
              {fechaDeBolivia(retiro.retiradaEn)}
            </Renglon>
          </Renglones>
          <p className="ayuda">
            Retirada es un estado final.{" "}
            {pieza.publicadaEn ? "Su ficha pública dice «Ya no disponible»." : "Nunca se publicó."}
          </p>
        </BloqueNuncaSePublica>
      ) : sePuedeRetirar ? (
        <Form method="post">
          <BloqueNuncaSePublica titulo="Retirar del catálogo">
            <Campo etiqueta="Motivo" para="motivo">
              <Seleccion id="motivo" name="motivo" defaultValue="" aria-invalid={errores.motivo ? true : undefined}>
                <option value="" disabled>
                  Elige el motivo
                </option>
                {Object.entries(TEXTO_DEL_MOTIVO).map(([valor, texto]) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </Seleccion>
              {errores.motivo ? (
                <p className="campo-error" role="alert">
                  {errores.motivo}
                </p>
              ) : null}
            </Campo>
            <Campo etiqueta="Nota" para="nota" ayuda="Obligatoria con «Otro».">
              <AreaTexto id="nota" name="nota" maxLength={280} aria-invalid={errores.nota ? true : undefined} />
              {errores.nota ? (
                <p className="campo-error" role="alert">
                  {errores.nota}
                </p>
              ) : null}
            </Campo>
            <p className="ayuda">
              Retirada es un estado final: la pieza sale del catálogo y no se puede volver a
              publicar, reservar ni vender.
            </p>
            <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
              Retirar {pieza.codigo}
            </button>
          </BloqueNuncaSePublica>
        </Form>
      ) : (
        <BloquePanel titulo="Retirar del catálogo">
          <p className="ayuda">
            Solo se retira una pieza En preparación o Disponible. Esta está{" "}
            {TEXTO_DEL_ESTADO[pieza.estado].toLowerCase()}
            {pieza.estado === "reservada" ? ": cancela antes la reserva." : "."}
          </p>
        </BloquePanel>
      )}
    </>
  );
}
