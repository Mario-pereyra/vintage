import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { BarraAccionUnica, motivoDeFaltantes } from "~/componentes/barra-acciones";
import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoCifra, leerMonto, Seleccion } from "~/componentes/campos";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import { CONDICIONES, TEXTO_DE_CONDICION, type CondicionDePieza } from "~/dominio";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFormularioDeCompraAParticular } from "~/servidor/formulario-de-abastecimiento.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/comprar";

export const handle = { titulo: "Compra a particular", volverA: "/admin/piezas" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { proveedores: await obtenerDominio(context).listarProveedores() };
}

/**
 * Registra la pieza que se compró directamente a un particular, sin lote: el
 * costo de pieza es lo pagado. Luego se sigue cargando como cualquier pieza.
 */
export async function action({ request, context }: Route.ActionArgs) {
  const dominio = obtenerDominio(context);
  try {
    const pieza = await dominio.registrarCompraAParticular(
      leerFormularioDeCompraAParticular(await request.formData()),
    );
    return redirect(`/admin/piezas/${pieza.codigo}?nueva=guardada`);
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

export default function CompraAParticular({ loaderData, actionData }: Route.ComponentProps) {
  const { proveedores } = loaderData;
  const navegacion = useNavigation();
  const errores = actionData && "errores" in actionData ? (actionData.errores ?? {}) : {};
  const enviando = navegacion.state === "submitting";
  const [proveedorId, setProveedorId] = useState("");
  const [costo, setCosto] = useState("");
  const [condicion, setCondicion] = useState<CondicionDePieza | null>(null);

  if (proveedores.length === 0) {
    return (
      <BloquePanel titulo="Falta registrar a la persona" nuncaSePublica>
        <p className="ayuda">
          Registra primero a quien te vende la pieza como proveedor, con su nombre y su
          WhatsApp, y vuelve.
        </p>
        <Link className="btn btn-primario btn-ancho" to="/admin/proveedores">
          Ir a Proveedores
        </Link>
      </BloquePanel>
    );
  }

  const motivo = motivoDeFaltantes(
    [!proveedorId && "la persona", !leerMonto(costo) && "lo que le pagaste"].filter(
      (falta): falta is string => Boolean(falta),
    ),
  );

  return (
    <Form method="post">
      <BloquePanel titulo="La compra" nuncaSePublica>
        <p className="ayuda">
          Una sola pieza, sin lote: su costo es directamente lo que le pagaste. Después la
          cargas como cualquier otra.
        </p>
        <Campo etiqueta="Le compraste a" para="proveedorId">
          <Seleccion
            id="proveedorId"
            name="proveedorId"
            value={proveedorId}
            onChange={(evento) => setProveedorId(evento.target.value)}
            aria-invalid={errores.proveedorId ? true : undefined}
          >
            <option value="" disabled>
              Elige a la persona
            </option>
            {proveedores.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre}
              </option>
            ))}
          </Seleccion>
          <MensajeDeError texto={errores.proveedorId} />
          <p className="ayuda ayuda-enlace">
            ¿No está en la lista? <Link to="/admin/proveedores">Regístrala en Proveedores</Link>.
          </p>
        </Campo>

        <div className="par-cifras">
          <Campo etiqueta="Le pagaste" para="costo">
            <CampoCifra
              id="costo"
              name="costo"
              prefijo="Bs"
              value={costo}
              onChange={(evento) => setCosto(evento.target.value)}
              aria-invalid={errores.costoDirectoCentavos ? true : undefined}
            />
          </Campo>
        </div>
        <MensajeDeError texto={errores.costoDirectoCentavos} />
      </BloquePanel>

      <BloquePanel titulo="Cómo llegó">
        <Campo
          etiqueta="Condición de ingreso"
          idEtiqueta="et-condicion"
          ayuda="Opcional. Es la condición antes de limpiarla o repararla."
        >
          <ControlSegmentado
            etiquetadoPor="et-condicion"
            name="condicionIngreso"
            opciones={CONDICIONES.map((valor) => ({ valor, texto: TEXTO_DE_CONDICION[valor] }))}
            valor={condicion}
            alCambiar={setCondicion}
          />
          <MensajeDeError texto={errores.condicionIngreso} />
        </Campo>
      </BloquePanel>

      <BarraAccionUnica
        texto={enviando ? "Guardando…" : "Registrar compra"}
        motivo={motivo}
        disabled={enviando || motivo !== undefined}
      />
    </Form>
  );
}
