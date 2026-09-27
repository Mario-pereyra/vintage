import { Form, useNavigation } from "react-router";

import { BloquePanel } from "~/componentes/bloque-panel";
import { Campo, CampoTexto } from "~/componentes/campos";
import { EstadoVacio } from "~/componentes/estado-vacio";
import { Renglon, Renglones } from "~/componentes/renglon";
import { obtenerDominio } from "~/servidor/contexto.server";
import { leerFormularioDeProveedor } from "~/servidor/formulario-de-abastecimiento.server";
import { respuestaDeRechazo } from "~/servidor/formulario-de-pieza.server";

import type { BarraDelPanel } from "../layout";
import type { Route } from "./+types/lista";

export const handle = { titulo: "Proveedores", volverA: "/admin" } satisfies BarraDelPanel;

export async function loader({ context }: Route.LoaderArgs) {
  return { proveedores: await obtenerDominio(context).listarProveedores() };
}

/** Registra un proveedor. Un particular que vende una sola pieza también es proveedor. */
export async function action({ request, context }: Route.ActionArgs) {
  try {
    await obtenerDominio(context).registrarProveedor(
      leerFormularioDeProveedor(await request.formData()),
    );
    return { mensaje: "Proveedor registrado." };
  } catch (error) {
    return respuestaDeRechazo(error);
  }
}

export default function ListaDeProveedores({ loaderData, actionData }: Route.ComponentProps) {
  const { proveedores } = loaderData;
  const navegacion = useNavigation();
  const errores = actionData && "errores" in actionData ? actionData.errores : {};
  const enviando = navegacion.state === "submitting";

  return (
    <>
      <BloquePanel titulo="Nuevo proveedor">
        <p className="ayuda">
          Un particular que te vende una sola cartera también es proveedor.
        </p>
        <Form method="post" key={actionData?.mensaje}>
          <Campo etiqueta="Nombre" para="prov-nombre">
            <CampoTexto
              id="prov-nombre"
              name="nombre"
              placeholder="Ej.: Textiles del Sur, o Ana Gómez"
              aria-invalid={errores?.nombre ? true : undefined}
            />
            {errores?.nombre ? <p className="campo-error" role="alert">{errores.nombre}</p> : null}
          </Campo>
          <Campo etiqueta="Contacto" para="prov-contacto">
            <CampoTexto
              id="prov-contacto"
              name="contacto"
              placeholder="WhatsApp u otro medio"
              aria-invalid={errores?.contacto ? true : undefined}
            />
            {errores?.contacto ? (
              <p className="campo-error" role="alert">{errores.contacto}</p>
            ) : null}
          </Campo>
          <button type="submit" className="btn btn-primario btn-ancho" disabled={enviando}>
            {enviando ? "Guardando…" : "Registrar proveedor"}
          </button>
        </Form>
      </BloquePanel>

      {proveedores.length === 0 ? (
        <EstadoVacio
          titulo="Todavía no hay proveedores"
          detalle="Registra el primero arriba: le podrás asociar lotes y compras."
        />
      ) : (
        <BloquePanel titulo="Proveedores" detalle={`${proveedores.length}`}>
          <Renglones>
            {proveedores.map((proveedor) => (
              <Renglon key={proveedor.id} etiqueta={proveedor.nombre}>
                {proveedor.contacto}
              </Renglon>
            ))}
          </Renglones>
        </BloquePanel>
      )}
    </>
  );
}
