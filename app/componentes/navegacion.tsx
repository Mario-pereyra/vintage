import type { ReactNode } from "react";
import { Form, Link } from "react-router";

import { Icono } from "./icono";

/**
 * Barra pública, fina sobre rosa: la marca (Archivo 800, 21px, blanco) y la
 * búsqueda por Ref. o palabra en papel. Sin `busqueda`, solo la marca.
 */
export function BarraPublica({
  marca,
  busqueda,
}: {
  marca: string;
  /** Adónde envía la búsqueda (GET con `q`). */
  busqueda?: { accion: string; valor?: string };
}) {
  return (
    <header className="barra-publica">
      <Link className="marca" to="/">
        {marca}
      </Link>
      {busqueda ? (
        <Form method="get" action={busqueda.accion} role="search" className="buscar">
          <Icono nombre="buscar" />
          <label htmlFor="buscar-q" className="sr-only">
            Buscar por referencia o palabra
          </label>
          <input
            id="buscar-q"
            name="q"
            type="search"
            inputMode="search"
            placeholder="Ref. 142 o «tote»"
            defaultValue={busqueda.valor}
          />
        </Form>
      ) : null}
    </header>
  );
}

/** Miga de pan en rosa tinta, debajo de la barra pública. */
export function MigaDePan({
  pasos,
}: {
  pasos: readonly { texto: string; href?: string }[];
}) {
  return (
    <nav className="miga" aria-label="Ubicación">
      <ol>
        {pasos.map((paso, indice) => (
          <li key={indice}>
            {paso.href ? <Link to={paso.href}>{paso.texto}</Link> : paso.texto}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Barra del panel: pegajosa, de rosa (el único rosa del panel), con el botón
 * volver (40px), el título en blanco (Archivo 800, 20px) y la Ref. asignada en
 * una etiqueta de papel.
 */
export function BarraPanel({
  titulo,
  volverA,
  textoVolver = "Volver",
  codigo,
  acciones,
}: {
  titulo: string;
  volverA?: string;
  textoVolver?: string;
  codigo?: string;
  /** Algo más a la derecha (por ejemplo, salir). */
  acciones?: ReactNode;
}) {
  return (
    <header className="barra-panel">
      {volverA ? (
        <Link className="barra-panel-volver" to={volverA} aria-label={textoVolver}>
          <Icono nombre="volver" />
        </Link>
      ) : null}
      <h1>{titulo}</h1>
      {codigo || acciones ? (
        <div className="barra-panel-derecha">
          {codigo ? <span className="barra-panel-ref">{codigo}</span> : null}
          {acciones}
        </div>
      ) : null}
    </header>
  );
}
