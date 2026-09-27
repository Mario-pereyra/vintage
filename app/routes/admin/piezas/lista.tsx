import { Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { CampoTexto } from "~/componentes/campos";
import {
  ChipsDeFiltro,
  GrupoDeFiltro,
  SegmentoDeFiltro,
  type OpcionDeFiltro,
} from "~/componentes/filtros";
import { Icono } from "~/componentes/icono";
import { formatearPrecio } from "~/componentes/total";
import {
  CONDICIONES,
  TEXTO_DE_CONDICION,
  type CondicionDePieza,
  type FiltrosDeInventario,
  type PiezaDelInventario,
} from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Piezas", volverA: "/admin" } satisfies BarraDelPanel;

/** Un entero positivo de la URL, o `undefined` si no vino o no es válido. */
function enteroPositivo(valor: string | null): number | undefined {
  if (!valor) return undefined;
  const numero = Number(valor);
  return Number.isSafeInteger(numero) && numero > 0 ? numero : undefined;
}

function condicionValida(valor: string | null): CondicionDePieza | undefined {
  return (CONDICIONES as readonly string[]).includes(valor ?? "")
    ? (valor as CondicionDePieza)
    : undefined;
}

/** Tope de la búsqueda por Ref.: de sobra para un código completo. */
const CODIGO_MAXIMO = 20;

export async function loader({ request, context }: Route.LoaderArgs) {
  const parametros = new URL(request.url).searchParams;
  const filtrosCrudos = {
    q: (parametros.get("q") ?? "").trim().slice(0, CODIGO_MAXIMO),
    loteId: parametros.get("loteId") ?? "",
    tipoId: parametros.get("tipoId") ?? "",
    condicionIngreso: parametros.get("condicionIngreso") ?? "",
  };
  const filtros: FiltrosDeInventario = {
    texto: filtrosCrudos.q || undefined,
    loteId: enteroPositivo(filtrosCrudos.loteId),
    tipoId: enteroPositivo(filtrosCrudos.tipoId),
    condicionIngreso: condicionValida(filtrosCrudos.condicionIngreso),
  };

  const dominio = obtenerDominio(context);
  const [piezas, { tipos }, lotes] = await Promise.all([
    dominio.buscarInventario(filtros),
    dominio.listas(),
    dominio.listarLotes(),
  ]);

  return { piezas, tipos, lotes, filtrosCrudos };
}

type DatosDelInventario = Route.ComponentProps["loaderData"];
type FiltrosCrudos = DatosDelInventario["filtrosCrudos"];

/**
 * La URL del inventario con los filtros vigentes cambiados por `cambios` (un
 * valor vacío quita ese filtro). La URL es el estado: se puede volver atrás y
 * funciona sin JavaScript.
 */
function urlDelInventario(filtrosCrudos: FiltrosCrudos, cambios: Partial<FiltrosCrudos> = {}) {
  const parametros = new URLSearchParams();
  for (const [nombre, valor] of Object.entries({ ...filtrosCrudos, ...cambios })) {
    if (valor) parametros.set(nombre, valor);
  }
  const query = parametros.toString();
  return query ? `/admin/piezas?${query}` : "/admin/piezas";
}

const TITULO_DEL_GRUPO: Record<PiezaDelInventario["estado"], string> = {
  en_preparacion: "En preparación",
  disponible: "Disponibles",
  reservada: "Reservadas",
  vendida: "Vendidas",
  retirada: "Retiradas",
};

/** "12 días publicada", con la cifra en mono. */
function DiasPublicada({ dias }: { dias: number }) {
  return (
    <span className="fila-pieza-dias">
      {dias === 0 ? (
        "Vendida el mismo día que se publicó"
      ) : (
        <>
          <span className="cifra">{dias}</span> {dias === 1 ? "día publicada" : "días publicada"}
        </>
      )}
    </span>
  );
}

/** Una pieza del inventario: Ref., nombre, precio y, si está Vendida, sus días publicada. */
function FilaDePieza({ pieza }: { pieza: PiezaDelInventario }) {
  return (
    <li>
      <Link className="fila-pieza" to={`/admin/piezas/${pieza.codigo}`}>
        <span>
          <span className="fila-pieza-ref">{pieza.codigo}</span>
          <span
            className={
              pieza.nombre
                ? "fila-pieza-nombre"
                : "fila-pieza-nombre fila-pieza-nombre-vacio"
            }
          >
            {pieza.nombre ?? "Sin nombre todavía"}
          </span>
          {pieza.diasPublicada !== null ? <DiasPublicada dias={pieza.diasPublicada} /> : null}
        </span>
        <span className="fila-pieza-derecha">
          {pieza.precioCentavos !== null ? (
            <span className="fila-pieza-precio">
              {formatearPrecio(pieza.precioCentavos / 100)}
            </span>
          ) : (
            <span className="fila-pieza-precio-vacio">Sin precio</span>
          )}
          <Icono nombre="adelante" />
        </span>
      </Link>
    </li>
  );
}

function Filas({ piezas }: { piezas: readonly PiezaDelInventario[] }) {
  return (
    <ul className="filas-pieza">
      {piezas.map((pieza) => (
        <FilaDePieza key={pieza.codigo} pieza={pieza} />
      ))}
    </ul>
  );
}

/**
 * Buscar por Ref. y filtrar por tipo, lote y condición de ingreso. La búsqueda
 * va siempre a la vista; los filtros se abren aparte para que las piezas
 * entren en el primer viewport del celular. Cada filtro es un enlace: un toque
 * lo aplica y otro sobre el elegido lo quita.
 */
function BuscarYFiltrar({ datos }: { datos: DatosDelInventario }) {
  const { tipos, lotes, filtrosCrudos } = datos;
  const cambiar = (cambios: Partial<FiltrosCrudos>) => urlDelInventario(filtrosCrudos, cambios);

  const opcionesDeTipo: OpcionDeFiltro[] = [
    { clave: "todos", texto: "Todos", href: cambiar({ tipoId: "" }), activo: !filtrosCrudos.tipoId },
    ...tipos.map((tipo) => {
      const activo = filtrosCrudos.tipoId === String(tipo.id);
      return {
        clave: String(tipo.id),
        texto: tipo.nombre,
        href: cambiar({ tipoId: activo ? "" : String(tipo.id) }),
        activo,
      };
    }),
  ];

  const opcionesDeLote: OpcionDeFiltro[] = [
    { clave: "todos", texto: "Todos", href: cambiar({ loteId: "" }), activo: !filtrosCrudos.loteId },
    ...lotes.map((lote) => {
      const activo = filtrosCrudos.loteId === String(lote.id);
      return {
        clave: String(lote.id),
        texto: (
          <>
            <span className="cifra">#{lote.id}</span>
            {lote.proveedorNombre}
          </>
        ),
        etiqueta: `Lote ${lote.id}, de ${lote.proveedorNombre}`,
        href: cambiar({ loteId: activo ? "" : String(lote.id) }),
        activo,
      };
    }),
  ];

  const opcionesDeCondicion: OpcionDeFiltro[] = CONDICIONES.map((condicion) => {
    const activo = filtrosCrudos.condicionIngreso === condicion;
    return {
      clave: condicion,
      texto: <b>{TEXTO_DE_CONDICION[condicion]}</b>,
      href: cambiar({ condicionIngreso: activo ? "" : condicion }),
      activo,
    };
  });

  const lote = lotes.find((l) => String(l.id) === filtrosCrudos.loteId);
  const condicion = condicionValida(filtrosCrudos.condicionIngreso);
  const elegidos = [
    tipos.find((tipo) => String(tipo.id) === filtrosCrudos.tipoId)?.nombre,
    lote ? `Lote #${lote.id}` : undefined,
    condicion ? TEXTO_DE_CONDICION[condicion] : undefined,
  ].filter((valor): valor is string => Boolean(valor));

  const hayFiltros = Boolean(filtrosCrudos.q) || elegidos.length > 0;

  return (
    <div className="inventario-buscar">
      <Form method="get" role="search" className="buscar-ref">
        {/* Buscar otra Ref. no descarta los filtros elegidos. */}
        {filtrosCrudos.tipoId ? (
          <input type="hidden" name="tipoId" value={filtrosCrudos.tipoId} />
        ) : null}
        {filtrosCrudos.loteId ? (
          <input type="hidden" name="loteId" value={filtrosCrudos.loteId} />
        ) : null}
        {filtrosCrudos.condicionIngreso ? (
          <input type="hidden" name="condicionIngreso" value={filtrosCrudos.condicionIngreso} />
        ) : null}
        <label htmlFor="q" className="etiqueta">
          Buscar por Ref.
        </label>
        <div className="buscar-compradora-fila">
          <CampoTexto
            id="q"
            name="q"
            type="search"
            defaultValue={filtrosCrudos.q}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="search"
            placeholder="VT-0142 o 142"
            aria-describedby="q-ayuda"
          />
          <button type="submit" className="btn btn-icono" aria-label="Buscar">
            <Icono nombre="buscar" />
          </button>
        </div>
        <p className="ayuda" id="q-ayuda">
          Completa o solo una parte de sus cifras.
        </p>
      </Form>

      <details className="filtros-mas filtros-panel">
        <summary>
          <span className="filtros-mas-texto">
            <span>Tipo, lote y condición</span>
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
          <GrupoDeFiltro id="f-tipo" titulo="Tipo">
            <ChipsDeFiltro opciones={opcionesDeTipo} carril />
          </GrupoDeFiltro>
          {lotes.length > 0 ? (
            <GrupoDeFiltro id="f-lote" titulo="Lote">
              <ChipsDeFiltro opciones={opcionesDeLote} carril />
            </GrupoDeFiltro>
          ) : null}
          <GrupoDeFiltro
            id="f-condicion"
            titulo="Condición de ingreso"
            ayuda={
              condicion
                ? "Toca la elegida para ver todas."
                : "Cómo llegó la pieza en el lote, antes de prepararla."
            }
          >
            <SegmentoDeFiltro opciones={opcionesDeCondicion} />
          </GrupoDeFiltro>
        </div>
      </details>

      {hayFiltros ? (
        <Link to="/admin/piezas" className="filtros-quitar" preventScrollReset replace>
          Quitar búsqueda y filtros
        </Link>
      ) : null}
    </div>
  );
}

/**
 * El aviso de "nada coincide", según lo que realmente se usó: solo mencionar
 * la Ref. cuando hubo una búsqueda por código, nunca cuando el vacío viene
 * solo de tipo, lote o condición.
 */
function avisoDeInventarioVacio(filtrosCrudos: FiltrosCrudos): string {
  const hayTexto = Boolean(filtrosCrudos.q);
  const hayOtrosFiltros = Boolean(
    filtrosCrudos.loteId || filtrosCrudos.tipoId || filtrosCrudos.condicionIngreso,
  );
  if (hayTexto && hayOtrosFiltros) {
    return "Ninguna pieza coincide. Prueba con menos cifras de la Ref. o quita un filtro.";
  }
  if (hayTexto) {
    return "Ninguna pieza coincide con esa Ref. Prueba con menos cifras, o solo con números.";
  }
  if (hayOtrosFiltros) {
    return "Ninguna pieza coincide. Quita un filtro.";
  }
  return "Todavía no hay piezas. Cada una recibe su Ref. al guardarla por primera vez, aunque le falten datos: la completas y la publicas después.";
}

export default function ListaDePiezas({ loaderData }: Route.ComponentProps) {
  const { piezas, filtrosCrudos } = loaderData;

  // Agrupadas por estado, en el orden del ciclo de la pieza.
  const porEstado = (
    ["en_preparacion", "disponible", "reservada", "vendida", "retirada"] as const
  )
    .map((estado) => [estado, piezas.filter((pieza) => pieza.estado === estado)] as const)
    .filter(([, grupo]) => grupo.length > 0);

  return (
    <>
      <Link className="btn btn-primario btn-ancho" to="/admin/piezas/nueva">
        <Icono nombre="mas" />
        Cargar pieza
      </Link>
      <Link className="btn btn-ancho" to="/admin/piezas/comprar">
        Comprar a un particular
      </Link>

      <BloquePanel
        titulo="Inventario"
        detalle={`${piezas.length} ${piezas.length === 1 ? "pieza" : "piezas"}`}
      >
        <BuscarYFiltrar datos={loaderData} />
        {piezas.length === 0 ? (
          <p className="panel-aviso inventario-vacio">{avisoDeInventarioVacio(filtrosCrudos)}</p>
        ) : null}
      </BloquePanel>

      {porEstado.map(([estado, grupo]) => (
        <BloquePanel key={estado} titulo={TITULO_DEL_GRUPO[estado]} detalle={`${grupo.length}`}>
          {estado === "en_preparacion" ? (
            <p className="ayuda">Guardadas, todavía no se ven en el catálogo.</p>
          ) : null}
          {estado === "vendida" ? (
            <p className="ayuda">Con los días que estuvo publicada cada una hasta venderse.</p>
          ) : null}
          <Filas piezas={grupo} />
        </BloquePanel>
      ))}
    </>
  );
}
