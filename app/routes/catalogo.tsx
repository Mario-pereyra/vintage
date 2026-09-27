import { env } from "cloudflare:workers";
import { Link } from "react-router";

import { Campo, CampoTexto, Seleccion } from "~/componentes/campos";
import { ComprobanteMini } from "~/componentes/comprobante";
import { BotonWhatsApp, enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Pagina } from "~/componentes/pagina";
import { Renglon, Renglones } from "~/componentes/renglon";
import { configuracionTienda, tituloDePagina } from "~/configuracion/tienda";
import { PIEZAS_POR_PAGINA, type FiltrosDeCatalogo, type PiezaEnCatalogo } from "~/dominio";
import { TAMANOS, type Tamano } from "~/dominio/tamano";
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

/** Un entero positivo de la URL, o `undefined` si no vino o no es válido. */
function enteroPositivo(valor: string | null): number | undefined {
  if (!valor) return undefined;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : undefined;
}

function tamanoValido(valor: string | null): Tamano | undefined {
  return (TAMANOS as readonly string[]).includes(valor ?? "") ? (valor as Tamano) : undefined;
}

/** Tope de la carga incremental: no se piden páginas arbitrariamente grandes. */
const TOMAR_MAXIMO = PIEZAS_POR_PAGINA * 5;

/**
 * Catálogo público: piezas Disponibles y Reservadas, más recientes primero,
 * con filtros por tipo, color, tamaño y precio en la URL (ADR 0006: se puede
 * compartir el listado filtrado) y carga incremental con "Cargar más".
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const parametros = new URL(request.url).searchParams;

  const filtrosCrudos = {
    tipo: parametros.get("tipo") ?? "",
    color: parametros.get("color") ?? "",
    tamano: parametros.get("tamano") ?? "",
    precioMin: parametros.get("precioMin") ?? "",
    precioMax: parametros.get("precioMax") ?? "",
  };

  const filtros: FiltrosDeCatalogo = {
    tipoId: enteroPositivo(filtrosCrudos.tipo),
    colorId: enteroPositivo(filtrosCrudos.color),
    tamano: tamanoValido(filtrosCrudos.tamano),
  };
  const precioMinBs = enteroPositivo(filtrosCrudos.precioMin);
  const precioMaxBs = enteroPositivo(filtrosCrudos.precioMax);
  if (precioMinBs !== undefined) filtros.precioMinCentavos = precioMinBs * 100;
  if (precioMaxBs !== undefined) filtros.precioMaxCentavos = precioMaxBs * 100;

  const tomar = Math.min(
    enteroPositivo(parametros.get("tomar")) ?? PIEZAS_POR_PAGINA,
    TOMAR_MAXIMO,
  );

  const dominio = obtenerDominio(context);
  const [catalogo, listas] = await Promise.all([
    dominio.listarCatalogo(filtros, tomar),
    dominio.listas(),
  ]);

  return {
    catalogo,
    listas,
    tomar,
    filtrosCrudos,
    whatsapp: env.WHATSAPP_NUMBER || configuracionTienda.whatsapp,
  };
}

/** La query string de los filtros vigentes, más `tomar` si no es el valor por defecto. */
function armarQuery(filtrosCrudos: Route.ComponentProps["loaderData"]["filtrosCrudos"], tomar?: number) {
  const parametros = new URLSearchParams();
  for (const [nombre, valor] of Object.entries(filtrosCrudos)) {
    if (valor) parametros.set(nombre, valor);
  }
  if (tomar && tomar !== PIEZAS_POR_PAGINA) parametros.set("tomar", String(tomar));
  const query = parametros.toString();
  return query ? `/?${query}` : "/";
}

function FormularioDeFiltros({
  listas,
  filtrosCrudos,
  hayFiltros,
}: {
  listas: Route.ComponentProps["loaderData"]["listas"];
  filtrosCrudos: Route.ComponentProps["loaderData"]["filtrosCrudos"];
  hayFiltros: boolean;
}) {
  return (
    <form method="get" className="filtros-catalogo" aria-label="Filtrar catálogo">
      <Campo etiqueta="Tipo" para="f-tipo">
        <Seleccion id="f-tipo" name="tipo" defaultValue={filtrosCrudos.tipo}>
          <option value="">Todos</option>
          {listas.tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </Seleccion>
      </Campo>
      <Campo etiqueta="Color" para="f-color">
        <Seleccion id="f-color" name="color" defaultValue={filtrosCrudos.color}>
          <option value="">Todos</option>
          {listas.colores.map((color) => (
            <option key={color.id} value={color.id}>
              {color.nombre}
            </option>
          ))}
        </Seleccion>
      </Campo>
      <Campo etiqueta="Tamaño" para="f-tamano">
        <Seleccion id="f-tamano" name="tamano" defaultValue={filtrosCrudos.tamano}>
          <option value="">Todos</option>
          {TAMANOS.map((tamano) => (
            <option key={tamano} value={tamano}>
              {tamano}
            </option>
          ))}
        </Seleccion>
      </Campo>
      <Campo etiqueta="Precio en Bs, desde" para="f-precio-min">
        <CampoTexto
          id="f-precio-min"
          name="precioMin"
          inputMode="numeric"
          placeholder="0"
          defaultValue={filtrosCrudos.precioMin}
        />
      </Campo>
      <Campo etiqueta="Precio en Bs, hasta" para="f-precio-max">
        <CampoTexto
          id="f-precio-max"
          name="precioMax"
          inputMode="numeric"
          placeholder="Sin tope"
          defaultValue={filtrosCrudos.precioMax}
        />
      </Campo>
      <div className="filtros-catalogo-acciones">
        <button type="submit" className="btn btn-primario">
          Filtrar
        </button>
        {hayFiltros ? (
          <Link to="/" className="btn">
            Quitar filtros
          </Link>
        ) : null}
      </div>
    </form>
  );
}

/** Una pieza del listado: foto (hueco hasta el #5), nombre, tamaño y precio. */
function FilaDeCatalogo({ pieza }: { pieza: PiezaEnCatalogo }) {
  return (
    <li>
      <ComprobanteMini
        href={pieza.ruta}
        codigo={pieza.codigo}
        nombre={pieza.nombre}
        precio={pieza.precioCentavos / 100}
        tamano={pieza.tamano}
        sello={pieza.estado === "reservada" ? "Reservada" : undefined}
      />
    </li>
  );
}

export default function Catalogo({ loaderData }: Route.ComponentProps) {
  const { catalogo, listas, tomar, filtrosCrudos, whatsapp } = loaderData;
  const { piezas, hayMas } = catalogo;
  const hayFiltros = Object.values(filtrosCrudos).some(Boolean);

  return (
    <Pagina titulo="Catálogo">
      <FormularioDeFiltros listas={listas} filtrosCrudos={filtrosCrudos} hayFiltros={hayFiltros} />

      {piezas.length === 0 ? (
        hayFiltros ? (
          <EstadoVacio
            titulo="Ninguna pieza coincide"
            detalle="Probá con menos filtros o quitalos para ver todo el catálogo."
            accion={
              <Link to="/" className="btn">
                Quitar filtros
              </Link>
            }
          />
        ) : (
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
        )
      ) : (
        <>
          <ul className="catalogo-lista">
            {piezas.map((pieza) => (
              <FilaDeCatalogo key={pieza.codigo} pieza={pieza} />
            ))}
          </ul>
          {hayMas ? (
            <Link
              className="btn btn-ancho"
              to={armarQuery(filtrosCrudos, tomar + PIEZAS_POR_PAGINA)}
            >
              Cargar más
            </Link>
          ) : null}
        </>
      )}
    </Pagina>
  );
}
