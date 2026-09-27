import { type ReactNode, useState } from "react";
import { data, Form, Link, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Comprobante, PieComprobante } from "~/componentes/comprobante";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { Sello } from "~/componentes/sello";
import {
  type CampoDePieza,
  type DropDelPanel,
  ErrorDeDominio,
  type PiezaDeDrop,
} from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/detalle";
import { contar, fechaCorta } from "./textos";

export const handle = { titulo: "Drop", volverA: "/admin/drops" } satisfies BarraDelPanel;

/** Cómo se nombra cada dato obligatorio en la línea de lo que falta. */
const NOMBRE_DEL_DATO: Partial<Record<CampoDePieza, string>> = {
  nombre: "el nombre",
  tipoId: "el tipo",
  colorId: "el color",
  materialId: "el material",
  altoCm: "el alto",
  anchoCm: "el ancho",
  profundidadCm: "la profundidad",
  precioCentavos: "el precio",
};
const MEDIDAS: CampoDePieza[] = ["altoCm", "anchoCm", "profundidadCm"];

/** "Falta el precio y 2 tomas", "Faltan las medidas y las 8 tomas". */
function lineaDeFaltantes(datos: readonly CampoDePieza[], tomas: number): string {
  const todasLasMedidas = MEDIDAS.every((medida) => datos.includes(medida));
  const partes: { texto: string; plural: boolean }[] = [];
  for (const campo of datos) {
    if (todasLasMedidas && MEDIDAS.includes(campo)) {
      if (campo === MEDIDAS[0]) partes.push({ texto: "las medidas", plural: true });
      continue;
    }
    const nombre = NOMBRE_DEL_DATO[campo];
    if (nombre) partes.push({ texto: nombre, plural: false });
  }
  if (tomas === 8) partes.push({ texto: "las 8 tomas", plural: true });
  else if (tomas > 0) partes.push({ texto: contar(tomas, "toma", "tomas"), plural: tomas > 1 });
  if (partes.length === 0) return "Revisa sus datos";
  const lista = new Intl.ListFormat("es", { type: "conjunction" }).format(
    partes.map((parte) => parte.texto),
  );
  const plural = partes.length > 1 || partes[0].plural;
  return `${plural ? "Faltan" : "Falta"} ${lista}`;
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const id = Number(params.id);
  const drop = Number.isSafeInteger(id) ? await dominio.dropDelPanel(id) : null;
  if (!drop) throw data(null, { status: 404 });
  const [piezas, disponibles] = await Promise.all([
    dominio.piezasDeDrop(id),
    dominio.piezasSinDropEnPreparacion(),
  ]);
  // Qué le falta a cada pieza En preparación que todavía no está lista: la
  // misma cuenta que hace la edición de la pieza (datos obligatorios y tomas).
  const incompletas = await Promise.all(
    piezas
      .filter((pieza) => pieza.estado === "en_preparacion" && !pieza.lista)
      .map(async (pieza) => {
        const completa = await dominio.piezaDelPanel(pieza.codigo);
        return {
          ...pieza,
          falta: completa
            ? lineaDeFaltantes(completa.faltanParaPublicar, completa.tomasFaltantes.length)
            : "Revisa sus datos",
        };
      }),
  );
  return { drop, piezas, incompletas, disponibles };
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
          mensaje:
            codigos.length === 1
              ? "Se asignó 1 pieza al drop."
              : `Se asignaron ${codigos.length} piezas al drop.`,
        };
      }
      case "publicar_todas":
      case "publicar_elegidas": {
        const publicadas = await dominio.publicarDrop(
          id,
          intencion === "publicar_elegidas" ? codigos : undefined,
        );
        return {
          intencion,
          mensaje:
            publicadas.length === 1
              ? "Se publicó 1 pieza: ya está en el catálogo."
              : `Se publicaron ${publicadas.length} piezas: ya están en el catálogo.`,
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

/** El estado del drop, estampado como sello sobre su cartel. */
function selloDelDrop(drop: DropDelPanel): { texto: string; detalle?: string } {
  if (drop.piezasTotal === 0) return { texto: "Vacío", detalle: "sin piezas" };
  if (drop.piezasPublicadas === 0) return { texto: "En armado", detalle: "no visible aún" };
  if (drop.piezasPublicadas === drop.piezasTotal) return { texto: "Publicado" };
  return {
    texto: "En curso",
    detalle: `${drop.piezasPublicadas} de ${drop.piezasTotal} publicadas`,
  };
}

/**
 * Casillas para elegir piezas (asignar o publicar), con el botón que dice
 * cuántas se eligieron. Sin ninguna elegida, el botón se apaga y la línea de
 * motivo dice por qué.
 */
function ElegirPiezas({
  intencion,
  piezas,
  accion,
  primario,
  enviando,
}: {
  intencion: Intencion;
  piezas: { codigo: string; nombre: string | null }[];
  accion: (cuantas: number) => ReactNode;
  primario: boolean;
  enviando: boolean;
}) {
  const [elegidas, setElegidas] = useState<ReadonlySet<string>>(new Set());
  const todas = elegidas.size === piezas.length;
  const intencionEnviada = useNavigation().formData?.get("intencion");
  const enviandoEsta = enviando && intencionEnviada === intencion;
  const cambiar = (codigo: string, marcada: boolean) => {
    const siguiente = new Set(elegidas);
    if (marcada) siguiente.add(codigo);
    else siguiente.delete(codigo);
    setElegidas(siguiente);
  };

  return (
    <Form method="post" className="elegir-piezas">
      <input type="hidden" name="intencion" value={intencion} />
      {piezas.length > 1 ? (
        <button
          type="button"
          className="elegir-todas"
          onClick={() => setElegidas(todas ? new Set() : new Set(piezas.map((p) => p.codigo)))}
        >
          {todas ? "Quitar todas" : `Elegir las ${piezas.length}`}
        </button>
      ) : null}
      <ul className="filas-elegir">
        {piezas.map((pieza) => (
          <li key={pieza.codigo}>
            <label className="fila-elegir">
              <input
                type="checkbox"
                name="codigos"
                value={pieza.codigo}
                checked={elegidas.has(pieza.codigo)}
                onChange={(evento) => cambiar(pieza.codigo, evento.target.checked)}
              />
              <span className="fila-pieza-ref">{pieza.codigo}</span>
              <span
                className={
                  pieza.nombre ? "fila-pieza-nombre" : "fila-pieza-nombre fila-pieza-nombre-vacio"
                }
              >
                {pieza.nombre ?? "Sin nombre todavía"}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {elegidas.size === 0 ? (
        <p className="acciones-motivo elegir-motivo">Elige al menos una pieza</p>
      ) : null}
      <button
        type="submit"
        className={primario ? "btn btn-primario btn-ancho" : "btn btn-ancho"}
        disabled={elegidas.size === 0 || enviando}
      >
        {enviandoEsta
          ? intencion === "asignar"
            ? "Asignando…"
            : "Publicando…"
          : accion(elegidas.size)}
      </button>
    </Form>
  );
}

export default function DetalleDeDrop({ loaderData, actionData }: Route.ComponentProps) {
  const { drop, piezas, incompletas, disponibles } = loaderData;
  const navegacion = useNavigation();
  const enviando = navegacion.state === "submitting";
  const intencionEnviada = navegacion.formData?.get("intencion");
  const listas = piezas.filter((pieza) => pieza.estado === "en_preparacion" && pieza.lista);
  const publicadas = piezas.filter((pieza) => pieza.estado !== "en_preparacion");
  const sello = selloDelDrop(drop);
  // Tras cada envío, las casillas vuelven a empezar con lo que quedó.
  const claveDe = (lista: { codigo: string }[]) => lista.map((p) => p.codigo).join();
  const rechazo = actionData?.errores ? Object.values(actionData.errores)[0] : undefined;

  return (
    <>
      <Comprobante className="cartel-drop" etiquetadoPor="numero-drop">
        <h1 className="cartel-drop-numero" id="numero-drop">
          {drop.numero}
        </h1>
        <div className="cartel-drop-fila">
          <p className="cartel-drop-cuantas">
            <strong>{drop.piezasTotal}</strong>
            {drop.piezasTotal === 1 ? "pieza" : "piezas"}
          </p>
          <Sello texto={sello.texto} detalle={sello.detalle} />
        </div>
        <Renglones>
          <Renglon etiqueta="Listas para publicar" cifra calculado={drop.piezasListas > 0}>
            {drop.piezasListas}
          </Renglon>
          <Renglon etiqueta="Les falta algo" cifra>
            {incompletas.length}
          </Renglon>
          <Renglon etiqueta="Ya publicadas" cifra>
            {drop.piezasPublicadas}
          </Renglon>
        </Renglones>
        <PieComprobante>Creado {fechaCorta(drop.creadoEn)}</PieComprobante>
      </Comprobante>

      {actionData?.mensaje ? (
        <div
          className={actionData.errores ? "panel-aviso panel-aviso-fuerte" : "panel-aviso"}
          role={actionData.errores ? "alert" : "status"}
        >
          {actionData.mensaje}
          {rechazo && rechazo !== actionData.mensaje ? <small>{rechazo}</small> : null}
        </div>
      ) : null}

      {listas.length > 0 ? (
        <BloquePanel titulo="Publicar" detalle={contar(listas.length, "lista", "listas")} completo>
          <Form method="post">
            <input type="hidden" name="intencion" value="publicar_todas" />
            <button type="submit" className="btn btn-primario btn-ancho btn-publicar-drop" disabled={enviando}>
              {enviando && intencionEnviada === "publicar_todas"
                ? "Publicando…"
                : listas.length === 1
                  ? "Publicar la pieza lista"
                  : `Publicar las ${listas.length} listas`}
            </button>
          </Form>
          <p className="ayuda">
            Pasan a Disponible y aparecen en el catálogo. Para publicar de a poco, elige
            cuáles:
          </p>
          <ElegirPiezas
            key={claveDe(listas)}
            intencion="publicar_elegidas"
            piezas={listas}
            primario={false}
            enviando={enviando}
            accion={(cuantas) =>
              cuantas === 0
                ? "Publicar las elegidas"
                : `Publicar ${contar(cuantas, "elegida", "elegidas")}`
            }
          />
        </BloquePanel>
      ) : incompletas.length > 0 ? (
        <BloquePanel titulo="Publicar">
          <p className="acciones-motivo">
            {incompletas.length === 1
              ? "La pieza del drop todavía no está lista: abajo dice qué le falta."
              : `Ninguna está lista todavía: abajo dice qué le falta a cada una.`}
          </p>
          <button type="button" className="btn btn-primario btn-ancho" disabled>
            Publicar las listas
          </button>
        </BloquePanel>
      ) : null}

      {incompletas.length > 0 ? (
        <BloquePanel
          titulo="Les falta para publicar"
          detalle={contar(incompletas.length, "pieza", "piezas")}
        >
          <ul className="filas-pieza">
            {incompletas.map((pieza) => (
              <li key={pieza.codigo}>
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
                    <span className="fila-falta">{pieza.falta}</span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </BloquePanel>
      ) : null}

      <BloquePanel
        titulo="Asignar piezas"
        detalle={disponibles.length > 0 ? contar(disponibles.length, "sin drop", "sin drop") : undefined}
      >
        {disponibles.length === 0 ? (
          <p className="ayuda">
            No hay piezas En preparación sin drop. Las piezas nuevas que cargues aparecen aquí.
          </p>
        ) : (
          <>
            <p className="ayuda">Piezas En preparación que todavía no están en ningún drop.</p>
            <ElegirPiezas
              key={claveDe(disponibles)}
              intencion="asignar"
              piezas={disponibles}
              primario={listas.length === 0}
              enviando={enviando}
              accion={(cuantas) => (
                <>
                  {cuantas === 0 ? "Asignar" : `Asignar ${contar(cuantas, "pieza", "piezas")}`} al{" "}
                  <span className="cifra">{drop.numero}</span>
                </>
              )}
            />
          </>
        )}
        <Link className="enlace-ficha" to="/admin/piezas/nueva">
          Cargar una pieza nueva
          <Icono nombre="adelante" />
        </Link>
      </BloquePanel>

      {publicadas.length > 0 ? (
        <BloquePanel
          titulo="Ya publicadas"
          detalle={contar(publicadas.length, "pieza", "piezas")}
        >
          <ul className="filas-pieza">
            {publicadas.map((pieza) => (
              <li key={pieza.codigo}>
                <Link className="fila-pieza" to={`/admin/piezas/${pieza.codigo}`}>
                  <span>
                    <span className="fila-pieza-ref">{pieza.codigo}</span>
                    <span className="fila-pieza-nombre">{pieza.nombre ?? "Sin nombre"}</span>
                  </span>
                  <span className="fila-pieza-derecha">
                    <span className="fila-estado">{TEXTO_DEL_ESTADO[pieza.estado]}</span>
                    <Icono nombre="adelante" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </BloquePanel>
      ) : null}
    </>
  );
}
