import { useState } from "react";
import { Form } from "react-router";

import { BarraAccionesPanel } from "~/componentes/barra-acciones";
import { BloquePanel } from "~/componentes/bloque-panel";
import {
  Campo,
  CampoMedida,
  CampoPrecio,
  CampoTexto,
  Medidas,
  TamanoDerivado,
} from "~/componentes/campos";
import { Chips } from "~/componentes/chips";
import { configuracionTienda } from "~/configuracion/tienda";
import type {
  CampoDePieza,
  EstadoDePieza,
  Listas,
  PiezaDelPanel,
} from "~/dominio";

/**
 * Formulario de carga y edición de una pieza (tipo, color, material, nombre,
 * medidas y precio publicado). Lo comparten `/admin/piezas/nueva` y
 * `/admin/piezas/:codigo`. Envía `intencion` = `guardar` o `publicar`; la
 * action lo lee con `leerFormularioDePieza` (servidor/formulario-de-pieza).
 */

/** Lo que devuelve la action cuando algo no se pudo guardar o publicar. */
export interface ResultadoDelFormulario {
  mensaje?: string;
  errores?: Partial<Record<string, string>>;
}

/** Cómo se nombra cada estado de pieza en el panel. */
export const TEXTO_DEL_ESTADO: Record<EstadoDePieza, string> = {
  en_preparacion: "En preparación",
  disponible: "Disponible",
  reservada: "Reservada",
  vendida: "Vendida",
  retirada: "Retirada",
};

// --- Interfaz --------------------------------------------------------------

function MensajeDeError({ texto }: { texto?: string }) {
  return texto ? (
    <p className="ayuda" role="alert">
      {texto}
    </p>
  ) : null;
}

/** Chips de una lista ampliable, con "+ Otro" para escribir un valor nuevo. */
function ListaAmpliable({
  campo,
  etiqueta,
  opciones,
  valorInicial,
  error,
}: {
  campo: "tipoId" | "colorId" | "materialId";
  etiqueta: string;
  opciones: readonly { id: number; nombre: string; muestra?: string | null }[];
  valorInicial: number | null;
  error?: string;
}) {
  const [valor, setValor] = useState<string | null>(
    valorInicial === null ? null : String(valorInicial),
  );
  const [otro, setOtro] = useState(false);
  const idEtiqueta = `et-${campo}`;

  return (
    <Campo etiqueta={etiqueta} idEtiqueta={idEtiqueta}>
      <Chips
        etiquetadoPor={idEtiqueta}
        name={campo}
        opciones={opciones.map((opcion) => ({
          valor: String(opcion.id),
          texto: opcion.nombre,
          muestra: opcion.muestra ?? undefined,
        }))}
        valor={valor}
        alCambiar={(nuevo) => {
          setValor(nuevo);
          setOtro(false);
        }}
        alPedirOtro={() => setOtro(true)}
      />
      {otro ? (
        <CampoTexto
          name={`${campo}Nuevo`}
          aria-label={`Nuevo valor de ${etiqueta.toLowerCase()}`}
          placeholder={`Escribe el nuevo ${etiqueta.toLowerCase()}`}
          autoFocus
        />
      ) : null}
      <MensajeDeError texto={error} />
    </Campo>
  );
}

const TEXTO_DEL_CAMPO: Record<CampoDePieza, string> = {
  nombre: "nombre",
  tipoId: "tipo",
  colorId: "color",
  materialId: "material",
  altoCm: "alto",
  anchoCm: "ancho",
  profundidadCm: "profundidad",
  caidaCm: "caída",
  precioCentavos: "precio",
};

function motivoParaPublicar(pieza: PiezaDelPanel | null): string | undefined {
  if (!pieza) return undefined;
  if (pieza.estado !== "en_preparacion") {
    return "Ya está publicada. Los cambios se ven en la ficha al guardar.";
  }
  if (pieza.faltanParaPublicar.length === 0) return undefined;
  return `Para publicar falta: ${pieza.faltanParaPublicar
    .map((campo) => TEXTO_DEL_CAMPO[campo])
    .join(", ")}.`;
}

export function FormularioDePieza({
  pieza,
  listas,
  resultado,
}: {
  /** `null` al cargar una pieza nueva. */
  pieza: PiezaDelPanel | null;
  listas: Listas;
  resultado?: ResultadoDelFormulario;
}) {
  const [ancho, setAncho] = useState(pieza?.anchoCm?.toString() ?? "");
  const errores = resultado?.errores ?? {};
  const publicada = pieza !== null && pieza.estado !== "en_preparacion";

  return (
    <Form method="post">
      {resultado?.mensaje ? (
        <p className="ayuda" role="status">
          {resultado.mensaje}
        </p>
      ) : null}

      <BloquePanel titulo="La pieza">
        <ListaAmpliable
          campo="tipoId"
          etiqueta="Tipo"
          opciones={listas.tipos}
          valorInicial={pieza?.tipoId ?? null}
          error={errores.tipoId}
        />
        <ListaAmpliable
          campo="colorId"
          etiqueta="Color"
          opciones={listas.colores}
          valorInicial={pieza?.colorId ?? null}
          error={errores.colorId}
        />
        <ListaAmpliable
          campo="materialId"
          etiqueta="Material"
          opciones={listas.materiales}
          valorInicial={pieza?.materialId ?? null}
          error={errores.materialId}
        />
        <Campo etiqueta="Nombre" para="nombre">
          <CampoTexto
            id="nombre"
            name="nombre"
            defaultValue={pieza?.nombre ?? ""}
            placeholder="Ej.: Bandolera de cuero negra"
          />
          <MensajeDeError texto={errores.nombre} />
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Medidas">
        <p className="ayuda">En cm, cerrada y sin contar asas.</p>
        <Medidas>
          <CampoMedida
            etiqueta="Alto"
            name="altoCm"
            defaultValue={pieza?.altoCm ?? ""}
          />
          <CampoMedida
            etiqueta="Ancho"
            name="anchoCm"
            value={ancho}
            onChange={(evento) => setAncho(evento.target.value)}
          />
          <CampoMedida
            etiqueta="Profundidad"
            name="profundidadCm"
            defaultValue={pieza?.profundidadCm ?? ""}
          />
        </Medidas>
        <TamanoDerivado
          ancho={Number(ancho.replace(",", ".")) || null}
          umbrales={configuracionTienda.umbralesDeTamano}
        />
        <MensajeDeError texto={errores.altoCm} />
        <MensajeDeError texto={errores.anchoCm} />
        <MensajeDeError texto={errores.profundidadCm} />
        <Campo
          etiqueta="Caída del asa o de la correa"
          para="caidaCm"
          ayuda="En cm. Déjala vacía si no tiene asa ni correa."
        >
          <CampoTexto
            id="caidaCm"
            name="caidaCm"
            inputMode="decimal"
            defaultValue={pieza?.caidaCm ?? ""}
          />
          <MensajeDeError texto={errores.caidaCm} />
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Precio publicado">
        <CampoPrecio
          name="precio"
          aria-label="Precio publicado en bolivianos"
          defaultValue={
            pieza?.precioCentavos != null ? pieza.precioCentavos / 100 : ""
          }
        />
        <MensajeDeError texto={errores.precioCentavos} />
      </BloquePanel>

      <BarraAccionesPanel
        guardar={{ name: "intencion", value: "guardar" }}
        publicar={
          publicada
            ? { type: "button", disabled: true, texto: "Publicada" }
            : { name: "intencion", value: "publicar" }
        }
        motivo={motivoParaPublicar(pieza)}
      />
    </Form>
  );
}
