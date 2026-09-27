import { env } from "cloudflare:workers";

import { BotonWhatsApp, enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Pagina } from "~/componentes/pagina";
import { Renglon, Renglones } from "~/componentes/renglon";
import { configuracionTienda, tituloDePagina } from "~/configuracion/tienda";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { Route } from "./+types/catalogo";

export function meta(_: Route.MetaArgs) {
  return [
    { title: tituloDePagina("Carteras de segunda mano seleccionadas") },
    {
      name: "description",
      content:
        "Carteras de segunda mano seleccionadas en Santa Cruz de la Sierra. Piezas únicas, con fotos y medidas reales.",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const piezas = await obtenerDominio(context).listarCatalogo();
  const whatsapp = env.WHATSAPP_NUMBER || configuracionTienda.whatsapp;
  return { piezas, whatsapp };
}

export default function Catalogo({ loaderData }: Route.ComponentProps) {
  const { piezas, whatsapp } = loaderData;

  return (
    <Pagina titulo="Catálogo">
      {piezas.length === 0 ? (
        <EstadoVacio
          titulo="Pronto nuevas carteras"
          sello={{ texto: "En preparación" }}
          detalle="Estamos preparando el próximo drop: cada pieza se limpia, se revisa y se mide antes de publicarse."
          accion={
            <BotonWhatsApp
              variante="secundario"
              conChat
              texto="Avisame del próximo drop"
              href={enlaceWhatsApp(
                whatsapp,
                "Hola, quiero enterarme del próximo drop",
              )}
            />
          }
        >
          <Renglones>
            <Renglon etiqueta="Disponibles" cifra>
              0
            </Renglon>
            <Renglon etiqueta="Reservadas" cifra>
              0
            </Renglon>
          </Renglones>
        </EstadoVacio>
      ) : null}
    </Pagina>
  );
}
