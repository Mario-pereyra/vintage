import { Link } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Correo } from "~/componentes/correo";
import { horaDeBolivia } from "~/componentes/hora";
import { Icono } from "~/componentes/icono";
import { Renglon, Renglones } from "~/componentes/renglon";
import { obtenerDominio, obtenerOperadora } from "~/servidor/contexto.server";

import type { Route } from "./+types/inicio";
import type { BarraDelPanel } from "./layout";

export const handle = { titulo: "Inicio" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  const { nombre, correo } = obtenerOperadora(context);
  const dominio = obtenerDominio(context);
  const [reservas, entregas] = await Promise.all([
    dominio.listarReservasActivas(),
    dominio.listarEntregasPendientes(),
  ]);
  return {
    nombre,
    correo,
    reservas: resumenDeReservas(reservas),
    entregas:
      entregas.length === 0
        ? "Ninguna pendiente"
        : entregas.length === 1
          ? "1 pendiente"
          : `${entregas.length} pendientes`,
  };
}

/** "2 activas · la próxima vence 16:40", para decidir de un vistazo si entrar. */
function resumenDeReservas(reservas: { venceEn: Date }[]): string {
  const [proxima] = reservas;
  if (!proxima) return "Ninguna activa ahora";
  const activas = reservas.length === 1 ? "1 activa" : `${reservas.length} activas`;
  return `${activas} · la próxima vence ${horaDeBolivia(proxima.venceEn)}`;
}

export default function InicioDelPanel({ loaderData }: Route.ComponentProps) {
  const { nombre, correo, reservas, entregas } = loaderData;

  return (
    <>
      <h2 className="saludo">Hola, {nombre}</h2>

      <BloquePanel titulo="Secciones">
        <ul className="secciones">
          <li>
            <Link className="seccion" to="/admin/piezas">
              <span>
                <b>Piezas</b>
                <span>Cargar, editar y publicar</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
          <li>
            <Link className="seccion" to="/admin/reservas">
              <span>
                <b>Reservas</b>
                <span>{reservas}</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
          <li>
            <Link className="seccion" to="/admin/entregas">
              <span>
                <b>Entregas</b>
                <span>{entregas}</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
          <li>
            <Link className="seccion" to="/admin/lotes">
              <span>
                <b>Lotes</b>
                <span>Registrar, abrir y repartir su costo</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
          <li>
            <Link className="seccion" to="/admin/proveedores">
              <span>
                <b>Proveedores</b>
                <span>A quién le compras lotes y piezas</span>
              </span>
              <Icono nombre="adelante" />
            </Link>
          </li>
        </ul>
      </BloquePanel>

      <BloquePanel titulo="Tu sesión">
        <Renglones>
          <Renglon etiqueta="Operadora">{nombre}</Renglon>
          <Renglon etiqueta="Correo">
            <Correo>{correo}</Correo>
          </Renglon>
        </Renglones>
      </BloquePanel>
    </>
  );
}
