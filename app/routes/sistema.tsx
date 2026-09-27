import { useState } from "react";
import { Link, useSearchParams } from "react-router";

import { BarraAccionesPanel } from "~/componentes/barra-acciones";
import { BloqueNuncaSePublica, BloquePanel } from "~/componentes/bloque-panel";
import { BotonWhatsApp } from "~/componentes/boton-whatsapp";
import {
  AreaTexto,
  Campo,
  CampoMedida,
  CampoPrecio,
  CampoTexto,
  Medidas,
  Seleccion,
  TamanoDerivado,
} from "~/componentes/campos";
import { Chips } from "~/componentes/chips";
import {
  Comprobante,
  EncabezadoComprobante,
  NombrePieza,
  PieComprobante,
} from "~/componentes/comprobante";
import { ControlSegmentado } from "~/componentes/control-segmentado";
import { InterruptorMostrar } from "~/componentes/interruptor-mostrar";
import { MigaDePan } from "~/componentes/navegacion";
import { Pagina } from "~/componentes/pagina";
import { PaginaPanel } from "~/componentes/pagina-panel";
import { Grupo, Renglon, Renglones } from "~/componentes/renglon";
import { Total } from "~/componentes/total";
import { configuracionTienda, tituloDePagina } from "~/configuracion/tienda";
import { rangoDeTamano, tamanoPorAncho } from "~/dominio/tamano";

import type { Route } from "./+types/sistema";

/**
 * Muestrario de los componentes base, solo en desarrollo (`/sistema` y
 * `/sistema?vista=panel`). Sirve para revisar el sistema a 390 y 1280px; en
 * producción responde 404.
 */
export function loader() {
  if (!import.meta.env.DEV) throw new Response(null, { status: 404 });
  return null;
}

export function meta(_: Route.MetaArgs) {
  return [
    { title: tituloDePagina("Sistema") },
    { name: "robots", content: "noindex" },
  ];
}

const condiciones = [
  { valor: "EXCELENTE", texto: "Excelente" },
  { valor: "MUY_BUENA", texto: "Muy buena" },
  { valor: "BUENA", texto: "Buena" },
  { valor: "CON_DETALLES", texto: "Con detalles" },
] as const;

/** Tres ejemplos fijos: el mismo comprobante con cada sello. */
const ejemplos = [
  {
    codigo: "VT-0142",
    sello: { texto: "Revisada", detalle: "limpia · cierres ok" },
    accion: "principal",
  },
  {
    codigo: "VT-0138",
    sello: { texto: "Reservada", detalle: "hasta las 16:40" },
    accion: "Avisame si se libera",
  },
  {
    codigo: "VT-0131",
    sello: { texto: "Vendida", detalle: "14/09 · Bs 180" },
    accion: "Ver carteras disponibles",
  },
] as const;

const ANCHO_DE_EJEMPLO = 30;

function OtraVista({ panel }: { panel: boolean }) {
  return (
    <p className="mx-auto mb-s-4 max-w-[640px] text-right text-[13px]">
      <Link to={panel ? "/sistema" : "/sistema?vista=panel"}>
        {panel ? "Ver la vista pública" : "Ver la vista del panel"}
      </Link>
    </p>
  );
}

export default function Sistema() {
  const [parametros] = useSearchParams();
  return parametros.get("vista") === "panel" ? <VistaPanel /> : <VistaPublica />;
}

function VistaPublica() {
  const umbrales = configuracionTienda.umbralesDeTamano;
  const tamano = tamanoPorAncho(ANCHO_DE_EJEMPLO, umbrales);

  return (
    <Pagina titulo="Sistema" busqueda={{ accion: "/sistema" }}>
      <OtraVista panel={false} />
      <MigaDePan
        pasos={[{ texto: "Carteras", href: "/" }, { texto: "Bandoleras" }]}
      />
      <div className="mx-auto flex max-w-[440px] flex-col gap-s-7">
        {ejemplos.map((ejemplo) => (
          <div key={ejemplo.codigo}>
            <Comprobante etiquetadoPor={`ref-${ejemplo.codigo}`}>
              <EncabezadoComprobante
                codigo={ejemplo.codigo}
                id={`ref-${ejemplo.codigo}`}
                como="h2"
                sello={ejemplo.sello}
              />
              <NombrePieza>Bandolera de cuero negra</NombrePieza>
              <Renglones>
                <Renglon
                  etiqueta="Medidas"
                  cifra
                  aclaracion="alto × ancho × profundidad, cerrada"
                >
                  22 × {ANCHO_DE_EJEMPLO} × 9 cm
                </Renglon>
                <Renglon
                  etiqueta="Tamaño"
                  aclaracion={rangoDeTamano(tamano, umbrales)}
                >
                  {tamano}
                </Renglon>
              </Renglones>
              <Grupo>La pieza</Grupo>
              <Renglones>
                <Renglon etiqueta="Tipo">Bandolera</Renglon>
                <Renglon etiqueta="Material">Cuero</Renglon>
              </Renglones>
              <Grupo>Revisión</Grupo>
              <Renglones>
                <Renglon etiqueta="Condición">Muy buena</Renglon>
                <Renglon etiqueta="Detalle" nota>
                  Leve marca de uso en una esquina de la base (foto 4).
                </Renglon>
              </Renglones>
              <Total precio={180} precioAnterior={220} />
              <PieComprobante>
                Publicada 12/09 · DROP #03 · Una sola unidad
              </PieComprobante>
            </Comprobante>
            {/* Mismo ancho que la barra fija de la ficha (12px de margen a 390px). */}
            <div className="-mx-s-2 mt-s-4 md:mx-0">
              {ejemplo.accion === "principal" ? (
                <BotonWhatsApp
                  variante="principal"
                  telefono={configuracionTienda.whatsapp}
                  codigo={ejemplo.codigo}
                  nombre="Bandolera de cuero negra"
                />
              ) : (
                <BotonWhatsApp
                  variante="secundario"
                  href="/"
                  texto={ejemplo.accion}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </Pagina>
  );
}

function VistaPanel() {
  const [tipo, setTipo] = useState<string | null>("BANDOLERA");
  const [color, setColor] = useState<string | null>("NEGRO");
  const [condicion, setCondicion] = useState<string | null>("MUY_BUENA");
  const [ancho, setAncho] = useState(String(ANCHO_DE_EJEMPLO));

  return (
    <PaginaPanel titulo="Muestrario" inicio="/sistema?vista=panel">
      <OtraVista panel />

      <BloquePanel titulo="La pieza">
        <Campo etiqueta="Tipo" idEtiqueta="et-tipo">
          <Chips
            etiquetadoPor="et-tipo"
            opciones={[
              { valor: "DE_HOMBRO", texto: "De hombro" },
              { valor: "DE_MANO", texto: "De mano" },
              { valor: "BANDOLERA", texto: "Bandolera" },
              { valor: "TOTE", texto: "Tote" },
              { valor: "CLUTCH", texto: "Clutch" },
            ]}
            valor={tipo}
            alCambiar={setTipo}
            alPedirOtro={() => {}}
          />
        </Campo>
        <Campo etiqueta="Color" idEtiqueta="et-color">
          <Chips
            etiquetadoPor="et-color"
            opciones={[
              { valor: "NEGRO", texto: "Negro", muestra: "#16130f" },
              { valor: "CAFE", texto: "Café", muestra: "#7a4a2a" },
              { valor: "BEIGE", texto: "Beige", muestra: "#d9c3a0" },
            ]}
            valor={color}
            alCambiar={setColor}
          />
        </Campo>
        <Campo etiqueta="Nombre" para="nombre">
          <CampoTexto id="nombre" defaultValue="Bandolera de cuero negra" />
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Medidas" detalle="3 de 3" completo>
        <p className="ayuda">Cerrada, sin contar asas.</p>
        <Medidas>
          <CampoMedida etiqueta="Alto" defaultValue="22" />
          <CampoMedida
            etiqueta="Ancho"
            value={ancho}
            onChange={(evento) => setAncho(evento.target.value)}
          />
          <CampoMedida etiqueta="Profundidad" defaultValue="9" />
        </Medidas>
        <TamanoDerivado
          ancho={Number(ancho.replace(",", ".")) || null}
          umbrales={configuracionTienda.umbralesDeTamano}
        />
      </BloquePanel>

      <BloquePanel titulo="Revisión">
        <Campo
          etiqueta="Condición"
          idEtiqueta="et-condicion"
          mostrar={<InterruptorMostrar campo="Condición" defaultChecked />}
        >
          <ControlSegmentado
            etiquetadoPor="et-condicion"
            opciones={condiciones}
            valor={condicion}
            alCambiar={setCondicion}
          />
        </Campo>
        <Campo
          etiqueta="Detalle que conserva"
          para="nota"
          mostrar={<InterruptorMostrar campo="Detalle" />}
        >
          <AreaTexto
            id="nota"
            placeholder="Opcional. Ej.: leve marca en la base (foto 4)."
          />
        </Campo>
        <Campo etiqueta="Marca" para="marca">
          <Seleccion id="marca">
            <option>Sin marca</option>
            <option>+ Agregar marca…</option>
          </Seleccion>
        </Campo>
      </BloquePanel>

      <BloquePanel titulo="Precio publicado">
        <CampoPrecio
          aria-label="Precio publicado en bolivianos"
          defaultValue="180"
        />
      </BloquePanel>

      <BloqueNuncaSePublica titulo="Procedencia">
        <Campo etiqueta="Lote" para="lote">
          <Seleccion id="lote">
            <option>Compra a particular</option>
          </Seleccion>
        </Campo>
      </BloqueNuncaSePublica>

      <BarraAccionesPanel
        vistaPrevia={{ onClick: () => {} }}
        guardar={{ type: "button" }}
        publicar={{ type: "button", disabled: true }}
        motivo="Faltan 8 tomas para publicar"
      />
    </PaginaPanel>
  );
}
