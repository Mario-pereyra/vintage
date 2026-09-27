import { env } from "cloudflare:workers";
import { data, redirect } from "react-router";

import { AccionFija, BotonWhatsApp } from "~/componentes/boton-whatsapp";
import {
  Comprobante,
  EncabezadoComprobante,
  NombrePieza,
  PieComprobante,
} from "~/componentes/comprobante";
import { GaleriaDeTomas } from "~/componentes/galeria-tomas";
import { Icono } from "~/componentes/icono";
import { Pagina } from "~/componentes/pagina";
import { Grupo, Renglon, Renglones } from "~/componentes/renglon";
import { Total } from "~/componentes/total";
import { configuracionTienda, tituloDePagina } from "~/configuracion/tienda";
import type { FichaPublica } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { Route } from "./+types/ficha";

/**
 * Ficha pública de una pieza: `/carteras/<slug>-<sufijo>`. Todo lo que muestra
 * sale de `fichaPublica` del dominio. Una pieza En preparación o un sufijo
 * inexistente responden 404; un slug viejo (la pieza cambió de nombre)
 * redirige a la dirección vigente.
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const ficha = await obtenerDominio(context).fichaPublica(params.direccion);
  if (!ficha) throw data(null, { status: 404 });

  const pedida = new URL(request.url);
  if (decodeURIComponent(pedida.pathname) !== ficha.ruta) {
    throw redirect(ficha.ruta, 301);
  }

  return {
    ficha,
    url: new URL(ficha.ruta, pedida.origin).href,
    whatsapp: env.WHATSAPP_NUMBER || configuracionTienda.whatsapp,
  };
}

function precio(ficha: FichaPublica) {
  return ficha.precioCentavos / 100;
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: tituloDePagina("No encontramos esta cartera") }];
  const { ficha, url } = loaderData;
  return [
    { title: tituloDePagina(`${ficha.nombre} · Ref. ${ficha.codigo}`) },
    {
      name: "description",
      content: `${ficha.tipo} ${ficha.color.toLowerCase()} de ${ficha.material.toLowerCase()}, tamaño ${ficha.tamano.nombre.toLowerCase()}. Bs ${precio(ficha)}. Ref. ${ficha.codigo}.`,
    },
    { tagName: "link", rel: "canonical", href: url },
  ];
}

const SELLO: Record<FichaPublica["estado"], string> = {
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  retirada: "Ya no disponible",
};

function cm(valor: number) {
  return valor.toLocaleString("es-BO", { maximumFractionDigits: 1 });
}

/** "12/09", siempre con dos cifras (el ICU de es-BO deja el mes en una). */
function fechaCorta(valor: Date) {
  const partes = new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "numeric",
    timeZone: "America/La_Paz",
  }).formatToParts(valor);
  const parte = (tipo: "day" | "month") =>
    (partes.find((p) => p.type === tipo)?.value ?? "").padStart(2, "0");
  return `${parte("day")}/${parte("month")}`;
}

export default function Ficha({ loaderData }: Route.ComponentProps) {
  const { ficha, url, whatsapp } = loaderData;
  const { medidas } = ficha;
  const disponible = ficha.estado === "disponible";

  return (
    <Pagina
      titulo={`${ficha.nombre}, Ref. ${ficha.codigo}`}
      miga={[{ texto: "Carteras", href: "/" }, { texto: ficha.tipo }]}
      sinMargen
    >
      <div
        className={
          disponible ? "ficha con-accion-fija" : "ficha ficha-no-disponible con-accion-fija"
        }
      >
        <GaleriaDeTomas
          sinFotos={
            <>
              <p className="toma-sin-foto-titulo">Las fotos de esta pieza todavía no están cargadas</p>
              <p className="toma-sin-foto-detalle">
                Pedilas por WhatsApp con la <span className="cifra">Ref. {ficha.codigo}</span>{" "}
                y te las mandamos.
              </p>
            </>
          }
        />

        <div className="ficha-comprobante">
          <Comprobante etiquetadoPor="ref-pieza">
            <EncabezadoComprobante
              codigo={ficha.codigo}
              id="ref-pieza"
              como="h2"
              sello={{ texto: SELLO[ficha.estado] }}
            />
            <NombrePieza>{ficha.nombre}</NombrePieza>
            <Renglones>
              <Renglon
                etiqueta="Medidas"
                cifra
                aclaracion="alto × ancho × profundidad, cerrada"
              >
                {cm(medidas.altoCm)} × {cm(medidas.anchoCm)} × {cm(medidas.profundidadCm)} cm
              </Renglon>
              {medidas.caidaCm !== null ? (
                <Renglon etiqueta="Caída del asa" cifra aclaracion="del asa o de la correa">
                  {cm(medidas.caidaCm)} cm
                </Renglon>
              ) : null}
              <Renglon etiqueta="Tamaño" aclaracion={ficha.tamano.rango}>
                {ficha.tamano.nombre}
              </Renglon>
            </Renglones>
            <Grupo>La pieza</Grupo>
            <Renglones>
              <Renglon etiqueta="Tipo">{ficha.tipo}</Renglon>
              <Renglon etiqueta="Color">{ficha.color}</Renglon>
              <Renglon etiqueta="Material">{ficha.material}</Renglon>
            </Renglones>
            <Total precio={precio(ficha)} />
            <PieComprobante>
              Publicada {fechaCorta(ficha.publicadaEn)} · Una sola unidad
            </PieComprobante>
          </Comprobante>

          <AccionFija>
            {disponible ? (
              <BotonWhatsApp
                variante="principal"
                telefono={whatsapp}
                codigo={ficha.codigo}
                nombre={ficha.nombre}
                url={url}
              />
            ) : (
              <BotonWhatsApp
                variante="secundario"
                href="/"
                texto="Ver carteras disponibles"
              />
            )}
          </AccionFija>
        </div>

        <div className="ficha-textos">
          <section className="sobre-rosa" aria-labelledby="t-medimos">
            <h2 id="t-medimos">Cómo la medimos</h2>
            <p>
              Cerrada y sin contar asas: alto × ancho × profundidad, en centímetros. El
              tamaño sale del ancho, con estos rangos:
            </p>
            <ul className="lista-sobre-rosa lista-tamanos">
              {ficha.tamanos.map((tamano) => {
                const esta = tamano.nombre === ficha.tamano.nombre;
                return (
                  <li key={tamano.nombre} aria-current={esta ? "true" : undefined}>
                    <b>{tamano.nombre}</b>
                    <span>{tamano.rango}</span>
                    {esta ? <em>Esta pieza</em> : null}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="sobre-rosa" aria-labelledby="t-recibis">
            <h2 id="t-recibis">Cómo la recibís</h2>
            <ul className="lista-sobre-rosa">
              <li>
                <Icono nombre="ubicacion" />
                <span>
                  <b>Retiro en Santa Cruz</b>Coordinamos el punto por WhatsApp.
                </span>
              </li>
              <li>
                <Icono nombre="delivery" />
                <span>
                  <b>Delivery en Santa Cruz</b>Costo según tu zona.
                </span>
              </li>
              <li>
                <Icono nombre="paquete" />
                <span>
                  <b>Envío a otro departamento</b>Por encomienda o flota; te pasamos la guía.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </Pagina>
  );
}
