import { env } from "cloudflare:workers";
import { Link } from "react-router";

import { BotonWhatsApp, enlaceWhatsApp } from "~/componentes/boton-whatsapp";
import { ComprobanteMini } from "~/componentes/comprobante";
import { EstadoVacio } from "~/componentes/estado-vacio";
import {
  ChipsDeFiltro,
  GrupoDeFiltro,
  SegmentoDeFiltro,
  type OpcionDeFiltro,
} from "~/componentes/filtros";
import { Icono } from "~/componentes/icono";
import { Pagina } from "~/componentes/pagina";
import { Renglon, Renglones } from "~/componentes/renglon";
import { configuracionTienda, tituloDePagina } from "~/configuracion/tienda";
import { PIEZAS_POR_PAGINA, type FiltrosDeCatalogo, type PiezaEnCatalogo } from "~/dominio";
import { TAMANOS, type Tamano, type UmbralesDeTamano } from "~/dominio/tamano";
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
 * con filtros por tipo, color, tamaño y precio en la URL, así el listado
 * filtrado se puede compartir, y carga incremental con "Cargar más".
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
    umbrales: configuracionTienda.umbralesDeTamano,
    whatsapp: env.WHATSAPP_NUMBER || configuracionTienda.whatsapp,
  };
}

type DatosDelCatalogo = Route.ComponentProps["loaderData"];
type FiltrosCrudos = DatosDelCatalogo["filtrosCrudos"];

/**
 * La URL del catálogo con los filtros vigentes cambiados por `cambios` (un
 * valor vacío quita ese filtro). Cambiar un filtro vuelve a la primera página;
 * `tomar` solo viaja si no es el valor por defecto.
 */
function urlDeCatalogo(
  filtrosCrudos: FiltrosCrudos,
  cambios: Partial<FiltrosCrudos> = {},
  tomar?: number,
) {
  const parametros = new URLSearchParams();
  for (const [nombre, valor] of Object.entries({ ...filtrosCrudos, ...cambios })) {
    if (valor) parametros.set(nombre, valor);
  }
  if (tomar && tomar !== PIEZAS_POR_PAGINA) parametros.set("tomar", String(tomar));
  const query = parametros.toString();
  return query ? `/?${query}` : "/";
}

/** El rango de ancho de cada tamaño, corto para el segmento: "<18", "18–24", "33+". */
function rangoCorto(tamano: Tamano, umbrales: UmbralesDeTamano) {
  switch (tamano) {
    case "Mini":
      return `<${umbrales.pequenaDesde}`;
    case "Pequeña":
      return `${umbrales.pequenaDesde}–${umbrales.medianaDesde - 1}`;
    case "Mediana":
      return `${umbrales.medianaDesde}–${umbrales.grandeDesde - 1}`;
    case "Grande":
      return `${umbrales.grandeDesde}+`;
  }
}

/** Atajos de precio para un toque; los precios van de unos Bs 30 a Bs 500. */
const BANDAS_DE_PRECIO = [
  {
    clave: "hasta-100",
    texto: (
      <>
        Hasta <span className="cifra">Bs 100</span>
      </>
    ),
    precioMin: "",
    precioMax: "100",
  },
  {
    clave: "100-300",
    texto: (
      <>
        <span className="cifra">Bs 100</span> a <span className="cifra">300</span>
      </>
    ),
    precioMin: "100",
    precioMax: "300",
  },
  {
    clave: "desde-300",
    texto: (
      <>
        <span className="cifra">Bs 300</span> o más
      </>
    ),
    precioMin: "300",
    precioMax: "",
  },
] as const;

/**
 * "Bs 100 a 300", "Desde Bs 50", "Hasta Bs 200", o `null` sin filtro de
 * precio. Si el mínimo llega mayor que el máximo (una URL armada a mano, por
 * ejemplo), se muestran en el orden correcto: el dominio ya los intercambia
 * para la consulta, y el resumen no debe contradecirla.
 */
function describirPrecio({ precioMin, precioMax }: FiltrosCrudos) {
  if (precioMin && precioMax) {
    const [desde, hasta] =
      Number(precioMin) > Number(precioMax) ? [precioMax, precioMin] : [precioMin, precioMax];
    return `Bs ${desde} a ${hasta}`;
  }
  if (precioMin) return `Desde Bs ${precioMin}`;
  if (precioMax) return `Hasta Bs ${precioMax}`;
  return null;
}

/** Los filtros vigentes en palabras, para el estado "sin coincidencias". */
function filtrosEnPalabras({ filtrosCrudos, listas }: DatosDelCatalogo) {
  const tipo = listas.tipos.find((t) => String(t.id) === filtrosCrudos.tipo);
  const color = listas.colores.find((c) => String(c.id) === filtrosCrudos.color);
  const filas = [
    { etiqueta: "Tipo", valor: tipo?.nombre, cifra: false },
    { etiqueta: "Color", valor: color?.nombre, cifra: false },
    { etiqueta: "Tamaño", valor: filtrosCrudos.tamano || undefined, cifra: false },
    { etiqueta: "Precio", valor: describirPrecio(filtrosCrudos) ?? undefined, cifra: true },
  ];
  return filas.filter(
    (fila): fila is { etiqueta: string; valor: string; cifra: boolean } => Boolean(fila.valor),
  );
}

/**
 * Los filtros del catálogo sobre el rosa. El tipo va siempre a la vista, en un
 * carril de chips; color, tamaño y precio se abren con "Color, tamaño y
 * precio" para que las piezas entren en el primer viewport del celular. Todo
 * es un enlace o un formulario GET: la URL es el estado.
 */
function Filtros({
  datos,
  conQuitar,
}: {
  datos: DatosDelCatalogo;
  /** "Quitar filtros" al pie; sin coincidencias, esa acción la lleva el estado vacío. */
  conQuitar: boolean;
}) {
  const { listas, filtrosCrudos, umbrales } = datos;
  const cambiar = (cambios: Partial<FiltrosCrudos>) => urlDeCatalogo(filtrosCrudos, cambios);

  const tipos: OpcionDeFiltro[] = [
    { clave: "todas", texto: "Todas", href: cambiar({ tipo: "" }), activo: !filtrosCrudos.tipo },
    ...listas.tipos.map((tipo) => {
      const activo = filtrosCrudos.tipo === String(tipo.id);
      return {
        clave: String(tipo.id),
        texto: tipo.nombre,
        href: cambiar({ tipo: activo ? "" : String(tipo.id) }),
        activo,
      };
    }),
  ];

  const colores: OpcionDeFiltro[] = listas.colores.map((color) => {
    const activo = filtrosCrudos.color === String(color.id);
    return {
      clave: String(color.id),
      texto: color.nombre,
      muestra: color.muestra,
      href: cambiar({ color: activo ? "" : String(color.id) }),
      activo,
    };
  });

  const tamanos: OpcionDeFiltro[] = TAMANOS.map((tamano) => {
    const activo = filtrosCrudos.tamano === tamano;
    const rango = rangoCorto(tamano, umbrales);
    return {
      clave: tamano,
      texto: (
        <>
          <b>{tamano}</b>
          <small className="cifra">{rango}</small>
        </>
      ),
      etiqueta: `${tamano}, ${rango.replace("<", "menos de ").replace("+", " o más")} cm de ancho`,
      href: cambiar({ tamano: activo ? "" : tamano }),
      activo,
    };
  });

  const bandas: OpcionDeFiltro[] = BANDAS_DE_PRECIO.map((banda) => {
    const activo =
      filtrosCrudos.precioMin === banda.precioMin && filtrosCrudos.precioMax === banda.precioMax;
    return {
      clave: banda.clave,
      texto: banda.texto,
      href: cambiar(
        activo
          ? { precioMin: "", precioMax: "" }
          : { precioMin: banda.precioMin, precioMax: banda.precioMax },
      ),
      activo,
    };
  });

  const elegidos = [
    listas.colores.find((color) => String(color.id) === filtrosCrudos.color)?.nombre,
    filtrosCrudos.tamano,
    describirPrecio(filtrosCrudos),
  ].filter((valor): valor is string => Boolean(valor));
  const hayFiltros = Object.values(filtrosCrudos).some(Boolean);

  return (
    <section className="filtros" aria-label="Filtrar el catálogo">
      <GrupoDeFiltro id="f-tipo" titulo="Tipo">
        <ChipsDeFiltro opciones={tipos} carril />
      </GrupoDeFiltro>

      {/* Cerrado al llegar: el listado va primero. Lo elegido se lee en el resumen. */}
      <details className="filtros-mas">
        <summary>
          <span className="filtros-mas-texto">
            <span>Color, tamaño y precio</span>
            {elegidos.length > 0 ? (
              <span className="filtros-elegidos">{elegidos.join(" · ")}</span>
            ) : null}
          </span>
          {elegidos.length > 0 ? (
            <span className="filtros-cuenta cifra">
              {elegidos.length}
              <span className="sr-only"> elegidos</span>
            </span>
          ) : null}
          <Icono nombre="adelante" tamano={18} />
        </summary>

        <div className="filtros-cuerpo">
          {colores.length > 0 ? (
            <GrupoDeFiltro id="f-color" titulo="Color">
              <ChipsDeFiltro opciones={colores} />
            </GrupoDeFiltro>
          ) : null}

          <GrupoDeFiltro
            id="f-tamano"
            titulo="Tamaño"
            ayuda={
              filtrosCrudos.tamano
                ? "Ancho en cm. Tocá el tamaño elegido para ver todos."
                : "Ancho en cm, medido con la cartera cerrada."
            }
          >
            <SegmentoDeFiltro opciones={tamanos} />
          </GrupoDeFiltro>

          <GrupoDeFiltro id="f-precio" titulo="Precio">
            <ChipsDeFiltro opciones={bandas} />
            <form method="get" action="/" className="rango-precio">
              {filtrosCrudos.tipo ? (
                <input type="hidden" name="tipo" value={filtrosCrudos.tipo} />
              ) : null}
              {filtrosCrudos.color ? (
                <input type="hidden" name="color" value={filtrosCrudos.color} />
              ) : null}
              {filtrosCrudos.tamano ? (
                <input type="hidden" name="tamano" value={filtrosCrudos.tamano} />
              ) : null}
              <label className="rango-extremo">
                <span>Desde</span>
                <span className="rango-cifra">
                  <b aria-hidden="true">Bs</b>
                  <input
                    name="precioMin"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="–"
                    autoComplete="off"
                    defaultValue={filtrosCrudos.precioMin}
                  />
                </span>
              </label>
              <label className="rango-extremo">
                <span>Hasta</span>
                <span className="rango-cifra">
                  <b aria-hidden="true">Bs</b>
                  <input
                    name="precioMax"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="–"
                    autoComplete="off"
                    defaultValue={filtrosCrudos.precioMax}
                  />
                </span>
              </label>
              <button type="submit" className="btn btn-primario">
                Ver
              </button>
            </form>
          </GrupoDeFiltro>
        </div>
      </details>

      {hayFiltros && conQuitar ? (
        <Link to="/" className="filtros-quitar" preventScrollReset replace>
          Quitar filtros
        </Link>
      ) : null}
    </section>
  );
}

/** Una pieza del listado: foto (hueco hasta el #5), nombre, Ref., precio y tamaño. */
function TarjetaDePieza({ pieza }: { pieza: PiezaEnCatalogo }) {
  return (
    <li>
      <ComprobanteMini
        href={pieza.ruta}
        codigo={pieza.codigo}
        nombre={pieza.nombre}
        precio={pieza.precioCentavos / 100}
        tamano={pieza.tamano}
        foto={pieza.foto}
        sello={pieza.estado === "reservada" ? "Reservada" : undefined}
      />
    </li>
  );
}

export default function Catalogo({ loaderData }: Route.ComponentProps) {
  const { catalogo, filtrosCrudos, tomar, whatsapp } = loaderData;
  const { piezas, hayMas } = catalogo;
  const hayFiltros = Object.values(filtrosCrudos).some(Boolean);

  // Sin piezas publicadas: el catálogo entero está vacío, no hay nada que filtrar.
  if (piezas.length === 0 && !hayFiltros) {
    return (
      <Pagina titulo="Catálogo">
        <EstadoVacio
          titulo="Pronto nuevas carteras"
          sello={{ texto: "En preparación" }}
          detalle="Estamos preparando el próximo drop: cada pieza se limpia, se revisa y se mide antes de publicarse."
          accion={
            <BotonWhatsApp
              variante="secundario"
              conChat
              texto="Avisame del próximo drop"
              href={enlaceWhatsApp(whatsapp, "Hola, quiero enterarme del próximo drop")}
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
      </Pagina>
    );
  }

  return (
    <Pagina titulo="Catálogo">
      <div className="catalogo">
        <Filtros datos={loaderData} conQuitar={piezas.length > 0} />

        <div className="catalogo-resultados">
          {piezas.length === 0 ? (
            <EstadoVacio
              titulo="Ninguna pieza coincide"
              detalle="Cada cartera es única y el catálogo cambia con cada drop. Probá con menos filtros."
              accion={
                <Link to="/" className="btn btn-ancho" replace>
                  Quitar filtros y ver todo
                </Link>
              }
            >
              <Renglones>
                {filtrosEnPalabras(loaderData).map((fila) => (
                  <Renglon key={fila.etiqueta} etiqueta={fila.etiqueta} cifra={fila.cifra}>
                    {fila.valor}
                  </Renglon>
                ))}
              </Renglones>
            </EstadoVacio>
          ) : (
            <>
              <ul className="catalogo-lista">
                {piezas.map((pieza) => (
                  <TarjetaDePieza key={pieza.codigo} pieza={pieza} />
                ))}
              </ul>
              {hayMas ? (
                <Link
                  className="btn btn-ancho catalogo-mas"
                  to={urlDeCatalogo(filtrosCrudos, {}, tomar + PIEZAS_POR_PAGINA)}
                  preventScrollReset
                  replace
                >
                  Cargar más
                </Link>
              ) : (
                <p className="catalogo-fin">
                  {piezas.length === 1
                    ? "Esta es la única pieza"
                    : `Estas son las ${piezas.length} piezas`}
                  {hayFiltros ? " con estos filtros." : " del catálogo."}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </Pagina>
  );
}
