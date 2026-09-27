import { useEffect, useRef, useState } from "react";
import { Form, useNavigation } from "react-router";

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
import { TomasDelPanel } from "~/componentes/tomas-panel";
import { configuracionTienda } from "~/configuracion/tienda";
import type {
  CampoDePieza,
  EstadoDePieza,
  FotoDelPanel,
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

// --- Qué falta para publicar ------------------------------------------------

/**
 * Los datos sin los que el dominio no publica, en el orden del formulario, con
 * su artículo para armar la línea de motivo. Es un reflejo para la barra de
 * acciones: quien decide es `publicarPieza`.
 */
const OBLIGATORIOS = [
  ["nombre", "el nombre", "nombre"],
  ["tipoId", "el tipo", "tipoId"],
  ["colorId", "el color", "colorId"],
  ["materialId", "el material", "materialId"],
  ["altoCm", "el alto", "altoCm"],
  ["anchoCm", "el ancho", "anchoCm"],
  ["profundidadCm", "la profundidad", "profundidadCm"],
  ["precioCentavos", "el precio", "precio"],
] as const satisfies readonly (readonly [CampoDePieza, string, string])[];

type Obligatorio = (typeof OBLIGATORIOS)[number][0];

const MEDIDAS: readonly Obligatorio[] = ["altoCm", "anchoCm", "profundidadCm"];

/** Lo que falta según lo escrito ahora en el formulario (sin guardar). */
function faltanEnElFormulario(formulario: HTMLFormElement): Obligatorio[] {
  const datos = new FormData(formulario);
  const texto = (nombre: string) => String(datos.get(nombre) ?? "").trim();
  return OBLIGATORIOS.filter(([campo, , nombre]) => {
    if (campo === "tipoId" || campo === "colorId" || campo === "materialId") {
      return !texto(nombre) && !texto(`${nombre}Nuevo`);
    }
    if (campo === "nombre") return !texto(nombre);
    const numero = Number(texto(nombre).replace(",", "."));
    return !(numero > 0);
  }).map(([campo]) => campo);
}

/** "Para publicar falta el tipo, las medidas, el precio y 3 tomas." */
function lineaDeFaltantes(
  faltan: readonly CampoDePieza[],
  tomasQueFaltan: number,
): string | undefined {
  const todasLasMedidas = MEDIDAS.every((medida) => faltan.includes(medida));
  const partes: string[] = [];
  for (const [campo, texto] of OBLIGATORIOS) {
    if (!faltan.includes(campo)) continue;
    if (todasLasMedidas && MEDIDAS.includes(campo)) {
      if (campo === "altoCm") partes.push("las medidas");
      continue;
    }
    partes.push(texto);
  }
  if (tomasQueFaltan > 0) {
    partes.push(tomasQueFaltan === 1 ? "1 toma" : `${tomasQueFaltan} tomas`);
  }
  if (partes.length === 0) return undefined;
  const lista = new Intl.ListFormat("es", { type: "conjunction" }).format(partes);
  return `Para publicar falta ${lista}.`;
}

// --- Interfaz --------------------------------------------------------------

function MensajeDeError({ texto, id }: { texto?: string; id?: string }) {
  return texto ? (
    <p className="campo-error" id={id} role="alert">
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
  alCambiar,
}: {
  campo: "tipoId" | "colorId" | "materialId";
  etiqueta: string;
  opciones: readonly { id: number; nombre: string; muestra?: string | null }[];
  valorInicial: number | null;
  error?: string;
  alCambiar: () => void;
}) {
  const [valor, setValor] = useState<string | null>(
    valorInicial === null ? null : String(valorInicial),
  );
  const [otro, setOtro] = useState(false);
  const idEtiqueta = `et-${campo}`;
  const nombre = etiqueta.toLowerCase();

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
        valor={otro ? null : valor}
        alCambiar={(nuevo) => {
          setValor(nuevo);
          setOtro(false);
          alCambiar();
        }}
        alPedirOtro={() => {
          setOtro(true);
          alCambiar();
        }}
      />
      {otro ? (
        <div className="campo-otro">
          <CampoTexto
            name={`${campo}Nuevo`}
            aria-label={`Nuevo ${nombre}`}
            placeholder={`Escribe el ${nombre} nuevo`}
            autoFocus
          />
          <p className="ayuda">Se suma a la lista al guardar.</p>
        </div>
      ) : null}
      <MensajeDeError texto={error} />
    </Campo>
  );
}

export function FormularioDePieza({
  pieza,
  listas,
  fotos,
  r2PublicUrl,
  resultado,
}: {
  /** `null` al cargar una pieza nueva. */
  pieza: PiezaDelPanel | null;
  listas: Listas;
  /** Las fotos ya cargadas. Vacío en una pieza nueva: todavía no tiene código. */
  fotos: readonly FotoDelPanel[];
  r2PublicUrl: string;
  resultado?: ResultadoDelFormulario;
}) {
  const formulario = useRef<HTMLFormElement>(null);
  const navegacion = useNavigation();
  const [ancho, setAncho] = useState(pieza?.anchoCm?.toString() ?? "");
  const [faltan, setFaltan] = useState<readonly CampoDePieza[]>(
    pieza ? pieza.faltanParaPublicar : OBLIGATORIOS.map(([campo]) => campo),
  );
  const [tomas, setTomas] = useState<readonly FotoDelPanel[]>(fotos);
  const tomasQueFaltan = 8 - tomas.length;
  /** Mientras no se toque nada, la barra muestra el resultado del último envío. */
  const [tocado, setTocado] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(resultado);
  if (resultado !== ultimoResultado) {
    setUltimoResultado(resultado);
    setTocado(false);
  }

  const errores = resultado?.errores ?? {};

  // Tras un rechazo, lleva a la operadora al primer dato marcado: la barra de
  // acciones solo dice "Revisa los datos marcados".
  useEffect(() => {
    if (!resultado?.errores || Object.keys(resultado.errores).length === 0) return;
    const primero = formulario.current?.querySelector<HTMLElement>(
      '[aria-invalid="true"], .campo-error',
    );
    if (!primero) return;
    primero.scrollIntoView({ block: "center" });
    if (primero.matches("input")) primero.focus({ preventScroll: true });
  }, [resultado]);
  const publicada = pieza !== null && pieza.estado !== "en_preparacion";
  const enviando = navegacion.state === "submitting";
  const intencion = navegacion.formData?.get("intencion");

  // Los chips cambian un <input hidden>, que no dispara `change`: se recalcula
  // después de que React lo actualice.
  const recalcular = () => {
    setTocado(true);
    requestAnimationFrame(() => {
      if (formulario.current) setFaltan(faltanEnElFormulario(formulario.current));
    });
  };

  // Publicar deshabilitado siempre dice por qué, aunque haya un mensaje del envío.
  const porQue = publicada
    ? "Ya está publicada: al guardar, la ficha se actualiza."
    : lineaDeFaltantes(faltan, tomasQueFaltan);
  const motivo = enviando
    ? intencion === "publicar"
      ? "Publicando…"
      : "Guardando…"
    : !tocado && resultado?.mensaje
      ? [resultado.mensaje, publicada ? undefined : porQue].filter(Boolean).join(" ")
      : porQue;

  return (
    <Form method="post" ref={formulario} onChange={recalcular}>
      <BloquePanel titulo="Fotos" detalle={`${tomas.length} de 8 tomas`} completo={tomas.length === 8}>
        {pieza ? (
          <p className="ayuda">
            Tocá un hueco para subir esa toma. Con dos huecos llenos, tocalos de a
            uno para intercambiar sus fotos.
          </p>
        ) : (
          <p className="ayuda">
            Guardá la pieza para poder cargar sus fotos. Las tomas van siempre en
            este orden.
          </p>
        )}
        <TomasDelPanel
          codigo={pieza?.codigo ?? null}
          fotos={tomas}
          r2PublicUrl={r2PublicUrl}
          onCambio={(nuevas) => {
            setTomas(nuevas);
            setTocado(true);
          }}
        />
        <MensajeDeError texto={errores.fotos} />
      </BloquePanel>

      <BloquePanel titulo="La pieza">
        <ListaAmpliable
          campo="tipoId"
          etiqueta="Tipo"
          opciones={listas.tipos}
          valorInicial={pieza?.tipoId ?? null}
          error={errores.tipoId}
          alCambiar={recalcular}
        />
        <ListaAmpliable
          campo="colorId"
          etiqueta="Color"
          opciones={listas.colores}
          valorInicial={pieza?.colorId ?? null}
          error={errores.colorId}
          alCambiar={recalcular}
        />
        <ListaAmpliable
          campo="materialId"
          etiqueta="Material"
          opciones={listas.materiales}
          valorInicial={pieza?.materialId ?? null}
          error={errores.materialId}
          alCambiar={recalcular}
        />
        <Campo etiqueta="Nombre" para="nombre">
          <CampoTexto
            id="nombre"
            name="nombre"
            defaultValue={pieza?.nombre ?? ""}
            placeholder="Ej.: Bandolera de cuero negra"
            autoComplete="off"
            aria-invalid={errores.nombre ? true : undefined}
          />
          <MensajeDeError texto={errores.nombre} />
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Medidas">
        <p className="ayuda">Cerrada, sin contar asas.</p>
        <Medidas>
          <CampoMedida
            etiqueta="Alto"
            name="altoCm"
            defaultValue={pieza?.altoCm ?? ""}
            aria-invalid={errores.altoCm ? true : undefined}
          />
          <CampoMedida
            etiqueta="Ancho"
            name="anchoCm"
            value={ancho}
            onChange={(evento) => setAncho(evento.target.value)}
            aria-invalid={errores.anchoCm ? true : undefined}
          />
          <CampoMedida
            etiqueta="Profundidad"
            name="profundidadCm"
            defaultValue={pieza?.profundidadCm ?? ""}
            aria-invalid={errores.profundidadCm ? true : undefined}
          />
        </Medidas>
        <TamanoDerivado
          ancho={Number(ancho.replace(",", ".")) || null}
          umbrales={configuracionTienda.umbralesDeTamano}
        />
        <MensajeDeError texto={errores.altoCm} />
        <MensajeDeError texto={errores.anchoCm} />
        <MensajeDeError texto={errores.profundidadCm} />
        <div className="medida-sola">
          <CampoMedida
            etiqueta="Caída del asa o de la correa"
            name="caidaCm"
            placeholder="—"
            defaultValue={pieza?.caidaCm ?? ""}
            aria-invalid={errores.caidaCm ? true : undefined}
          />
          <p className="ayuda">Opcional: déjala vacía si no tiene asa ni correa.</p>
        </div>
        <MensajeDeError texto={errores.caidaCm} />
      </BloquePanel>

      <BloquePanel titulo="Precio publicado">
        <CampoPrecio
          name="precio"
          aria-label="Precio publicado en bolivianos"
          defaultValue={
            pieza?.precioCentavos != null ? pieza.precioCentavos / 100 : ""
          }
          aria-invalid={errores.precioCentavos ? true : undefined}
        />
        <MensajeDeError texto={errores.precioCentavos} />
      </BloquePanel>

      <BarraAccionesPanel
        guardar={{
          name: "intencion",
          value: "guardar",
          disabled: enviando,
        }}
        publicar={
          publicada
            ? { type: "button", disabled: true, texto: "Publicada" }
            : {
                name: "intencion",
                value: "publicar",
                disabled: enviando || faltan.length > 0 || tomasQueFaltan > 0,
              }
        }
        motivo={motivo}
      />
    </Form>
  );
}
