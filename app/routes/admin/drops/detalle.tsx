import { data, Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import { ErrorDeDominio, type PiezaDeDrop } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/detalle";

export const handle = { titulo: "Drop", volverA: "/admin/drops" } satisfies BarraDelPanel;

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const id = Number(params.id);
  const drop = Number.isSafeInteger(id) ? await dominio.dropDelPanel(id) : null;
  if (!drop) throw data(null, { status: 404 });
  const [piezas, disponibles] = await Promise.all([
    dominio.piezasDeDrop(id),
    dominio.piezasSinDropEnPreparacion(),
  ]);
  return { drop, piezas, disponibles };
}

type Intencion = "asignar" | "publicar_todas" | "publicar_elegidas";

type Resultado = { intencion: Intencion; mensaje: string; errores?: Record<string, string> };

export async function action({ params, request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  const id = Number(params.id);
  const formulario = await request.formData();
  const intencion = String(formulario.get("intencion")) as Intencion;
  const codigos = formulario.getAll("codigos").map(String);

  try {
    return await ejecutar();
  } catch (error) {
    if (!(error instanceof ErrorDeDominio)) throw error;
    return data<Resultado>(
      { intencion, mensaje: error.message, errores: { ...error.errores } },
      { status: 400 },
    );
  }

  async function ejecutar(): Promise<Resultado> {
    switch (intencion) {
      case "asignar": {
        await dominio.asignarPiezasADrop(id, codigos);
        return {
          intencion,
          mensaje: codigos.length === 1 ? "Pieza asignada." : `${codigos.length} piezas asignadas.`,
        };
      }
      case "publicar_todas": {
        const publicadas = await dominio.publicarDrop(id);
        return {
          intencion,
          mensaje:
            publicadas.length === 1
              ? "Publicada 1 pieza."
              : `Publicadas ${publicadas.length} piezas.`,
        };
      }
      case "publicar_elegidas": {
        const publicadas = await dominio.publicarDrop(id, codigos);
        return {
          intencion,
          mensaje:
            publicadas.length === 1
              ? "Publicada 1 pieza."
              : `Publicadas ${publicadas.length} piezas.`,
        };
      }
      default:
        throw data(null, { status: 400 });
    }
  }
}

const TEXTO_DEL_ESTADO: Record<PiezaDeDrop["estado"], string> = {
  en_preparacion: "En preparación",
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  retirada: "Retirada",
};

export default function DetalleDeDrop({ loaderData, actionData }: Route.ComponentProps) {
  const { drop, piezas, disponibles } = loaderData;
  const enPreparacion = piezas.filter((pieza) => pieza.estado === "en_preparacion");
  const publicadas = piezas.filter((pieza) => pieza.estado !== "en_preparacion");
  const listas = enPreparacion.filter((pieza) => pieza.lista);

  const mensajeDe = (intencion: Intencion) =>
    actionData?.intencion === intencion ? (
      <p
        className={actionData.errores ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
        role={actionData.errores ? "alert" : "status"}
      >
        {actionData.mensaje}
      </p>
    ) : null;

  return (
    <>
      <div className="pieza-cabecera">
        <div>
          <p className="pieza-cabecera-ref">
            <span>Drop</span>
            {drop.numero}
          </p>
          <p className="pieza-cabecera-detalle">
            {drop.piezasTotal === 0
              ? "Todavía sin piezas"
              : `${drop.piezasTotal} ${drop.piezasTotal === 1 ? "pieza" : "piezas"}`}
          </p>
        </div>
        <Sello texto={`${drop.piezasListas} listas`} />
      </div>

      <BloquePanel titulo="Resumen" nuncaSePublica>
        <Renglones>
          <Renglon etiqueta="Total de piezas" cifra>
            {drop.piezasTotal}
          </Renglon>
          <Renglon etiqueta="Listas para publicar" cifra>
            {drop.piezasListas}
          </Renglon>
          <Renglon etiqueta="Ya publicadas" cifra>
            {drop.piezasPublicadas}
          </Renglon>
        </Renglones>
      </BloquePanel>

      {listas.length > 0 ? (
        <BloquePanel titulo="Publicar" detalle={`${listas.length} listas`}>
          {mensajeDe("publicar_todas")}
          {mensajeDe("publicar_elegidas")}
          <form method="post">
            <input type="hidden" name="intencion" value="publicar_todas" />
            <button type="submit" className="btn btn-primario btn-ancho">
              Publicar las {listas.length} listas
            </button>
          </form>
          <p className="ayuda">O elige solo algunas, para publicar de a poco:</p>
          <form method="post">
            <input type="hidden" name="intencion" value="publicar_elegidas" />
            <ul className="filas-pieza">
              {listas.map((pieza) => (
                <li key={pieza.codigo}>
                  <label className="casilla">
                    <input type="checkbox" name="codigos" value={pieza.codigo} />
                    <span>
                      {pieza.codigo} — {pieza.nombre ?? "Sin nombre todavía"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="submit" className="btn btn-ancho">
              Publicar las elegidas
            </button>
          </form>
        </BloquePanel>
      ) : null}

      <BloquePanel
        titulo="Piezas del drop"
        detalle={piezas.length === 1 ? "1 pieza" : `${piezas.length} piezas`}
      >
        {piezas.length === 0 ? (
          <p className="ayuda">Todavía no le asignaste ninguna pieza.</p>
        ) : (
          <ul className="filas-pieza">
            {[...enPreparacion, ...publicadas].map((pieza) => (
              <li key={pieza.codigo}>
                <Link className="fila-pieza" to={`/admin/piezas/${pieza.codigo}`}>
                  <span>
                    <span className="fila-pieza-ref">{pieza.codigo}</span>
                    <span className="fila-pieza-nombre">
                      {pieza.nombre ?? "Sin nombre todavía"}
                    </span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <span className="fila-lote-estado">
                      {pieza.estado === "en_preparacion"
                        ? pieza.lista
                          ? "Lista"
                          : "Incompleta"
                        : TEXTO_DEL_ESTADO[pieza.estado]}
                    </span>
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </BloquePanel>

      <BloquePanel titulo="Asignar piezas" detalle={`${disponibles.length} disponibles`}>
        {mensajeDe("asignar")}
        {disponibles.length === 0 ? (
          <EstadoVacio
            titulo="Nada para asignar"
            detalle="Todas las piezas En preparación ya están en un drop."
          />
        ) : (
          <form method="post">
            <input type="hidden" name="intencion" value="asignar" />
            <ul className="filas-pieza">
              {disponibles.map((pieza) => (
                <li key={pieza.codigo}>
                  <label className="casilla">
                    <input type="checkbox" name="codigos" value={pieza.codigo} />
                    <span>
                      {pieza.codigo} — {pieza.nombre ?? "Sin nombre todavía"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="submit" className="btn btn-primario btn-ancho">
              Asignar las elegidas
            </button>
          </form>
        )}
      </BloquePanel>
    </>
  );
}
