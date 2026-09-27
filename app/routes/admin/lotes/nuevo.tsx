import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoPrecio, CampoTexto, Seleccion } from "~/componentes/campos";
import { Chips } from "~/componentes/chips";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import {
  CANALES_DE_ABASTECIMIENTO,
  TEXTO_DE_CANAL,
  type CanalDeAbastecimiento,
} from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFormularioDeLote } from "~/servidor/formulario-de-abastecimiento.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/nuevo";

export const handle = { titulo: "Nuevo lote", volverA: "/admin/lotes" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  const dominio = obtenerDominio(context);
  const [proveedores, listas] = await Promise.all([dominio.listarProveedores(), dominio.listas()]);
  return { proveedores, calidadesDeclaradas: listas.calidadesDeclaradas };
}

export async function action({ request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  try {
    const datos = await leerFormularioDeLote(await request.formData(), dominio);
    const lote = await dominio.registrarLote(datos);
    return redirect(`/admin/lotes/${lote.id}`);
  } catch (error) {
    return respuestaDeRechazo(error);
  }
}

export default function NuevoLote({ loaderData, actionData }: Route.ComponentProps) {
  const { proveedores, calidadesDeclaradas } = loaderData;
  const navegacion = useNavigation();
  const errores = actionData && "errores" in actionData ? actionData.errores : {};
  const enviando = navegacion.state === "submitting";

  const [canal, setCanal] = useState<CanalDeAbastecimiento | null>(null);
  const [calidadId, setCalidadId] = useState<string | null>(null);
  const [otraCalidad, setOtraCalidad] = useState(false);

  if (proveedores.length === 0) {
    return (
      <BloquePanel titulo="Falta un proveedor">
        <p className="ayuda">Registra primero el proveedor de este lote.</p>
        <Link className="btn btn-primario btn-ancho" to="/admin/proveedores">
          Ir a Proveedores
        </Link>
      </BloquePanel>
    );
  }

  return (
    <Form method="post">
      <BloquePanel titulo="El lote">
        <Campo etiqueta="Proveedor" para="proveedorId">
          <Seleccion
            id="proveedorId"
            name="proveedorId"
            defaultValue=""
            aria-invalid={errores?.proveedorId ? true : undefined}
          >
            <option value="" disabled>
              Elige un proveedor
            </option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </Seleccion>
          {errores?.proveedorId ? (
            <p className="campo-error" role="alert">{errores.proveedorId}</p>
          ) : null}
        </Campo>

        <Campo etiqueta="Canal de abastecimiento" idEtiqueta="et-canal">
          <ControlSegmentado
            etiquetadoPor="et-canal"
            name="canal"
            opciones={CANALES_DE_ABASTECIMIENTO.map((valor) => ({
              valor,
              texto: TEXTO_DE_CANAL[valor],
            }))}
            valor={canal}
            alCambiar={setCanal}
          />
          {errores?.canal ? <p className="campo-error" role="alert">{errores.canal}</p> : null}
        </Campo>

        <Campo etiqueta="Calidad declarada" idEtiqueta="et-calidad">
          <Chips
            etiquetadoPor="et-calidad"
            name="calidadDeclaradaId"
            opciones={calidadesDeclaradas.map((c) => ({ valor: String(c.id), texto: c.nombre }))}
            valor={otraCalidad ? null : calidadId}
            alCambiar={(valor) => {
              setCalidadId(valor);
              setOtraCalidad(false);
            }}
            alPedirOtro={() => setOtraCalidad(true)}
          />
          {otraCalidad ? (
            <div className="campo-otro">
              <CampoTexto
                name="calidadDeclaradaIdNuevo"
                aria-label="Nueva calidad declarada"
                placeholder="Ej.: Tercera"
                autoFocus
              />
              <p className="ayuda">Se suma a la lista al guardar.</p>
            </div>
          ) : null}
          {errores?.calidadDeclaradaId ? (
            <p className="campo-error" role="alert">{errores.calidadDeclaradaId}</p>
          ) : null}
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Costo">
        <Campo etiqueta="Costo del lote" para="costo">
          <CampoPrecio
            id="costo"
            name="costo"
            aria-invalid={errores?.costoCentavos ? true : undefined}
          />
          {errores?.costoCentavos ? (
            <p className="campo-error" role="alert">{errores.costoCentavos}</p>
          ) : null}
        </Campo>
        <Campo etiqueta="Transporte" para="transporte" ayuda="Déjalo vacío si no hubo.">
          <CampoPrecio
            id="transporte"
            name="transporte"
            aria-invalid={errores?.transporteCentavos ? true : undefined}
          />
          {errores?.transporteCentavos ? (
            <p className="campo-error" role="alert">{errores.transporteCentavos}</p>
          ) : null}
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Fechas">
        <Campo etiqueta="Fecha de compra" para="fechaCompra">
          <CampoTexto
            id="fechaCompra"
            name="fechaCompra"
            type="date"
            aria-invalid={errores?.fechaCompra ? true : undefined}
          />
          {errores?.fechaCompra ? (
            <p className="campo-error" role="alert">{errores.fechaCompra}</p>
          ) : null}
        </Campo>
        <Campo etiqueta="Fecha de recepción" para="fechaRecepcion" ayuda="Déjala vacía si todavía no llegó.">
          <CampoTexto
            id="fechaRecepcion"
            name="fechaRecepcion"
            type="date"
            aria-invalid={errores?.fechaRecepcion ? true : undefined}
          />
          {errores?.fechaRecepcion ? (
            <p className="campo-error" role="alert">{errores.fechaRecepcion}</p>
          ) : null}
        </Campo>
      </BloquePanel>

      <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
        {enviando ? "Guardando…" : "Registrar lote"}
      </button>
    </Form>
  );
}
