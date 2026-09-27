import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { BarraAccionUnica, motivoDeFaltantes } from "~/componentes/barra-acciones";
import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoCifra, CampoTexto, leerMonto, Seleccion } from "~/componentes/campos";
import { Chips } from "~/componentes/chips";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import { formatearPrecio } from "~/componentes/total";
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

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="campo-error" role="alert">
      {texto}
    </p>
  ) : null;
}

export default function NuevoLote({ loaderData, actionData }: Route.ComponentProps) {
  const { proveedores, calidadesDeclaradas } = loaderData;
  const navegacion = useNavigation();
  const errores = actionData && "errores" in actionData ? (actionData.errores ?? {}) : {};
  const enviando = navegacion.state === "submitting";

  const [proveedorId, setProveedorId] = useState("");
  const [canal, setCanal] = useState<CanalDeAbastecimiento | null>(null);
  const [calidadId, setCalidadId] = useState<string | null>(null);
  const [otraCalidad, setOtraCalidad] = useState(false);
  const [calidadNueva, setCalidadNueva] = useState("");
  const [costo, setCosto] = useState("");
  const [transporte, setTransporte] = useState("");
  const [fechaCompra, setFechaCompra] = useState("");

  if (proveedores.length === 0) {
    return (
      <BloquePanel titulo="Falta un proveedor" nuncaSePublica>
        <p className="ayuda">
          Cada lote se le compra a alguien. Registra primero a ese proveedor y vuelve.
        </p>
        <Link className="btn btn-primario btn-ancho" to="/admin/proveedores">
          Ir a Proveedores
        </Link>
      </BloquePanel>
    );
  }

  const costoBs = leerMonto(costo);
  const transporteBs = transporte.trim() ? leerMonto(transporte) : 0;
  const tieneCalidad = otraCalidad ? calidadNueva.trim() !== "" : calidadId !== null;

  const motivo = motivoDeFaltantes(
    [
      !proveedorId && "el proveedor",
      !canal && "el canal",
      !tieneCalidad && "la calidad declarada",
      !costoBs && "el costo",
      !fechaCompra && "la fecha de compra",
    ].filter((falta): falta is string => Boolean(falta)),
  );

  return (
    <Form method="post">
      <BloquePanel titulo="El lote" nuncaSePublica>
        <Campo etiqueta="Proveedor" para="proveedorId">
          <Seleccion
            id="proveedorId"
            name="proveedorId"
            value={proveedorId}
            onChange={(evento) => setProveedorId(evento.target.value)}
            aria-invalid={errores.proveedorId ? true : undefined}
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
          <MensajeDeError texto={errores.proveedorId} />
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
          <MensajeDeError texto={errores.canal} />
        </Campo>

        <Campo etiqueta="Calidad declarada" idEtiqueta="et-calidad" ayuda="La que prometió el proveedor.">
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
                placeholder="Ej.: Mixta"
                value={calidadNueva}
                onChange={(evento) => setCalidadNueva(evento.target.value)}
                autoFocus
              />
              <p className="ayuda">Se suma a la lista al guardar.</p>
            </div>
          ) : null}
          <MensajeDeError texto={errores.calidadDeclaradaId} />
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Costo">
        <div className="par-cifras">
          <Campo etiqueta="Costo del lote" para="costo">
            <CampoCifra
              id="costo"
              name="costo"
              prefijo="Bs"
              value={costo}
              onChange={(evento) => setCosto(evento.target.value)}
              aria-invalid={errores.costoCentavos ? true : undefined}
            />
          </Campo>
          <Campo etiqueta="Transporte" para="transporte">
            <CampoCifra
              id="transporte"
              name="transporte"
              prefijo="Bs"
              value={transporte}
              onChange={(evento) => setTransporte(evento.target.value)}
              aria-invalid={errores.transporteCentavos ? true : undefined}
            />
          </Campo>
        </div>
        <MensajeDeError texto={errores.costoCentavos} />
        <MensajeDeError texto={errores.transporteCentavos} />
        <p className="derivado" aria-live="polite">
          {costoBs !== null && transporteBs !== null ? (
            <>
              → Se reparte entre sus piezas:{" "}
              <span className="cifra">{formatearPrecio(costoBs + transporteBs)}</span>
            </>
          ) : null}
        </p>
        {costoBs === null ? (
          <p className="ayuda">Deja el transporte vacío si no hubo.</p>
        ) : null}
      </BloquePanel>

      <BloquePanel titulo="Fechas">
        <Campo etiqueta="Fecha de compra" para="fechaCompra">
          <CampoTexto
            id="fechaCompra"
            name="fechaCompra"
            type="date"
            value={fechaCompra}
            onChange={(evento) => setFechaCompra(evento.target.value)}
            aria-invalid={errores.fechaCompra ? true : undefined}
          />
          <MensajeDeError texto={errores.fechaCompra} />
        </Campo>
        <Campo
          etiqueta="Fecha de recepción"
          para="fechaRecepcion"
          ayuda="Déjala vacía si todavía no llegó."
        >
          <CampoTexto
            id="fechaRecepcion"
            name="fechaRecepcion"
            type="date"
            aria-invalid={errores.fechaRecepcion ? true : undefined}
          />
          <MensajeDeError texto={errores.fechaRecepcion} />
        </Campo>
      </BloquePanel>

      <BarraAccionUnica
        texto={enviando ? "Guardando…" : "Registrar lote"}
        motivo={motivo}
        disabled={enviando || motivo !== undefined}
      />
    </Form>
  );
}
