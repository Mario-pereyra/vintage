import { Form, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { CampoTexto, Seleccion } from "~/componentes/campos";
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

export async function loader({ request, context }: Route.LoaderArgs) {
  const parametros = new URL(request.url).searchParams;
  const filtrosCrudos = {
    q: parametros.get("q") ?? "",
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

const TITULO_DEL_GRUPO: Record<PiezaDelInventario["estado"], string> = {
  en_preparacion: "En preparación",
  disponible: "Disponibles",
  reservada: "Reservadas",
  vendida: "Vendidas",
  retirada: "Retiradas",
};

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
          {pieza.diasPublicada !== null ? (
            <span className="ayuda">
              {pieza.diasPublicada === 0
                ? "Publicada y vendida el mismo día"
                : pieza.diasPublicada === 1
                  ? "1 día publicada"
                  : `${pieza.diasPublicada} días publicada`}
            </span>
          ) : null}
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

export default function ListaDePiezas({ loaderData }: Route.ComponentProps) {
  const { piezas, tipos, lotes, filtrosCrudos } = loaderData;
  const hayFiltros =
    filtrosCrudos.q || filtrosCrudos.loteId || filtrosCrudos.tipoId || filtrosCrudos.condicionIngreso;

  const enPreparacion = piezas.filter((pieza) => pieza.estado === "en_preparacion");
  const publicadas = piezas.filter((pieza) => pieza.estado !== "en_preparacion");

  // Las publicadas se agrupan por estado, en el orden del ciclo de la pieza.
  const porEstado = (["disponible", "reservada", "vendida", "retirada"] as const)
    .map((estado) => [estado, publicadas.filter((pieza) => pieza.estado === estado)] as const)
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

      <BloquePanel titulo="Buscar y filtrar">
        <Form method="get" role="search" className="filtros-inventario">
          <label htmlFor="q" className="etiqueta">
            Código (completo o parcial, p. ej. "142")
          </label>
          <div className="buscar-compradora-fila">
            <CampoTexto
              id="q"
              name="q"
              type="search"
              defaultValue={filtrosCrudos.q}
              autoComplete="off"
              enterKeyHint="search"
              placeholder="VT-0142"
            />
            <button type="submit" className="btn btn-icono" aria-label="Buscar">
              <Icono nombre="buscar" />
            </button>
          </div>

          <label htmlFor="tipoId" className="etiqueta">
            Tipo
          </label>
          <Seleccion id="tipoId" name="tipoId" defaultValue={filtrosCrudos.tipoId}>
            <option value="">Todos</option>
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre}
              </option>
            ))}
          </Seleccion>

          <label htmlFor="loteId" className="etiqueta">
            Lote
          </label>
          <Seleccion id="loteId" name="loteId" defaultValue={filtrosCrudos.loteId}>
            <option value="">Todos</option>
            {lotes.map((lote) => (
              <option key={lote.id} value={lote.id}>
                Lote #{lote.id} · {lote.proveedorNombre}
              </option>
            ))}
          </Seleccion>

          <label htmlFor="condicionIngreso" className="etiqueta">
            Condición de ingreso
          </label>
          <Seleccion
            id="condicionIngreso"
            name="condicionIngreso"
            defaultValue={filtrosCrudos.condicionIngreso}
          >
            <option value="">Todas</option>
            {CONDICIONES.map((condicion) => (
              <option key={condicion} value={condicion}>
                {TEXTO_DE_CONDICION[condicion]}
              </option>
            ))}
          </Seleccion>

          <button type="submit" className="btn btn-primario btn-ancho">
            Filtrar
          </button>
          {hayFiltros ? (
            <Link className="btn btn-ancho" to="/admin/piezas">
              Quitar filtros
            </Link>
          ) : null}
        </Form>
      </BloquePanel>

      {piezas.length === 0 ? (
        <BloquePanel titulo="Inventario" detalle="0 piezas">
          <p className="ayuda">
            {hayFiltros
              ? "Ninguna pieza coincide con la búsqueda o los filtros."
              : "Todavía no hay piezas. Cada una recibe su Ref. al guardarla por primera vez, aunque le falten datos: la completas y la publicas después."}
          </p>
        </BloquePanel>
      ) : null}

      {enPreparacion.length > 0 ? (
        <BloquePanel
          titulo={TITULO_DEL_GRUPO.en_preparacion}
          detalle={`${enPreparacion.length}`}
        >
          <p className="ayuda">Guardadas, todavía no se ven en el catálogo.</p>
          <Filas piezas={enPreparacion} />
        </BloquePanel>
      ) : null}

      {porEstado.map(([estado, grupo]) => (
        <BloquePanel
          key={estado}
          titulo={TITULO_DEL_GRUPO[estado]}
          detalle={`${grupo.length}`}
        >
          <Filas piezas={grupo} />
        </BloquePanel>
      ))}
    </>
  );
}
