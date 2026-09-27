import { useState } from "react";
import { Form, Link, redirect, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoPrecio, Seleccion } from "~/componentes/campos";
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

export default function CompraAParticular({ loaderData, actionData }: Route.ComponentProps) {
  const { proveedores } = loaderData;
  const navegacion = useNavigation();
  const errores = actionData && "errores" in actionData ? actionData.errores : {};
  const enviando = navegacion.state === "submitting";
  const [condicion, setCondicion] = useState<CondicionDePieza | null>(null);

  if (proveedores.length === 0) {
    return (
      <BloquePanel titulo="Falta registrar a la persona">
        <p className="ayuda">
          Registra primero a quien te vende la pieza como proveedor (con su nombre y su WhatsApp).
        </p>
        <Link className="btn btn-primario btn-ancho" to="/admin/proveedores">
          Ir a Proveedores
        </Link>
      </BloquePanel>
    );
  }

  return (
    <Form method="post">
      <BloquePanel titulo="Compra a particular">
        <p className="ayuda">
          Sin lote: el costo de la pieza es directamente lo que le pagaste.
        </p>
        <Campo etiqueta="Le compraste a" para="proveedorId">
          <Seleccion
            id="proveedorId"
            name="proveedorId"
            defaultValue=""
            aria-invalid={errores?.proveedorId ? true : undefined}
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
          {errores?.proveedorId ? (
            <p className="campo-error" role="alert">{errores.proveedorId}</p>
          ) : null}
        </Campo>

        <Campo etiqueta="Costo directo" para="costo">
          <CampoPrecio id="costo" name="costo" aria-invalid={errores?.costoDirectoCentavos ? true : undefined} />
          {errores?.costoDirectoCentavos ? (
            <p className="campo-error" role="alert">{errores.costoDirectoCentavos}</p>
          ) : null}
        </Campo>

        <Campo etiqueta="Condición de ingreso" idEtiqueta="et-condicion" ayuda="Opcional.">
          <ControlSegmentado
            etiquetadoPor="et-condicion"
            name="condicionIngreso"
            opciones={CONDICIONES.map((valor) => ({ valor, texto: TEXTO_DE_CONDICION[valor] }))}
            valor={condicion}
            alCambiar={setCondicion}
          />
        </Campo>
      </BloquePanel>

      <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
        {enviando ? "Guardando…" : "Registrar compra"}
      </button>
    </Form>
  );
}
