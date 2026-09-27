import { env } from "cloudflare:workers";
import { data, redirect } from "react-router";

import { AccionFija, BotonWhatsApp } from "~/componentes/boton-whatsapp";
import {
  Comprobante,
  EncabezadoComprobante,
  NombrePieza,
  PieComprobante,
} from "~/componentes/comprobante";
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

function fechaCorta(valor: Date) {
  return valor.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/La_Paz",
  });
}

export default function Ficha({ loaderData }: Route.ComponentProps) {
  const { ficha, url, whatsapp } = loaderData;
  const { medidas } = ficha;

  return (
    <Pagina
      titulo={`${ficha.nombre}, Ref. ${ficha.codigo}`}
      miga={[{ texto: "Carteras", href: "/" }, { texto: ficha.nombre }]}
    >
      <div className="con-accion-fija mx-auto max-w-[440px]">
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
              {cm(medidas.altoCm)} × {cm(medidas.anchoCm)} ×{" "}
              {cm(medidas.profundidadCm)} cm
            </Renglon>
            {medidas.caidaCm !== null ? (
              <Renglon etiqueta="Caída del asa" cifra>
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
          <Grupo>Tamaños</Grupo>
          <Renglones>
            {ficha.tamanos.map((tamano) => (
              <Renglon key={tamano.nombre} etiqueta={tamano.nombre}>
                {tamano.rango}
              </Renglon>
            ))}
          </Renglones>
          <Total precio={precio(ficha)} />
          <PieComprobante>
            Publicada {fechaCorta(ficha.publicadaEn)} · Una sola unidad
          </PieComprobante>
        </Comprobante>

        <AccionFija>
          {ficha.estado === "disponible" ? (
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
    </Pagina>
  );
}
