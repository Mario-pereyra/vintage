import { useState } from "react";

import { BarraAccionesPanel } from "~/componentes/barra-acciones";
import { BloqueNuncaSePublica, BloquePanel } from "~/componentes/bloque-panel";
import { AccionFija, BotonWhatsApp } from "~/componentes/boton-whatsapp";
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
import { rangoDeTamano } from "~/dominio/tamano";

import type { Route } from "./+types/sistema";

/**
 * Muestrario de los componentes base, solo en desarrollo (`/sistema`). Sirve
 * para revisar el sistema a 390 y 1280px; en producción responde 404.
 */
export function loader() {
  if (!import.meta.env.DEV) throw new Response(null, { status: 404 });
  return null;
}

export function meta(_: Route.MetaArgs) {
  return [{ title: tituloDePagina("Sistema") }, { name: "robots", content: "noindex" }];
}

const condiciones = [
  { valor: "EXCELENTE", texto: "Excelente" },
  { valor: "MUY_BUENA", texto: "Muy buena" },
  { valor: "BUENA", texto: "Buena" },
  { valor: "CON_DETALLES", texto: "Con detalles" },
] as const;

const estados = {
  disponible: { texto: "Revisada", detalle: "limpia · cierres ok" },
  reservada: { texto: "Reservada", detalle: "hasta las 16:40" },
  vendida: { texto: "Vendida", detalle: "14/09 · Bs 180" },
} as const;

export default function Sistema() {
  const [vista, setVista] = useState<"publica" | "panel">("publica");
  const [estado, setEstado] = useState<keyof typeof estados>("disponible");
  const [tipo, setTipo] = useState<string | null>("BANDOLERA");
  const [color, setColor] = useState<string | null>("NEGRO");
  const [condicion, setCondicion] = useState<string | null>("MUY_BUENA");
  const [ancho, setAncho] = useState("30");
  const umbrales = configuracionTienda.umbralesDeTamano;

  const selectorDeVista = (
    <div className="mx-auto mb-s-4 max-w-[640px]">
      <ControlSegmentado
        etiquetadoPor="vista-titulo"
        opciones={[
          { valor: "publica", texto: "Pública" },
          { valor: "panel", texto: "Panel" },
        ]}
        valor={vista}
        alCambiar={setVista}
      />
      <span id="vista-titulo" className="sr-only">
        Vista del muestrario
      </span>
    </div>
  );

  if (vista === "panel") {
    return (
      <PaginaPanel titulo="Nueva pieza" volverA="/sistema" codigo="VT-0143">
        {selectorDeVista}
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
              onChange={(e) => setAncho(e.target.value)}
            />
            <CampoMedida etiqueta="Profundidad" defaultValue="9" />
          </Medidas>
          <TamanoDerivado ancho={Number(ancho) || null} umbrales={umbrales} />
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
            <AreaTexto id="nota" placeholder="Opcional. Ej.: leve marca en la base (foto 4)." />
          </Campo>
          <Campo etiqueta="Marca" para="marca">
            <Seleccion id="marca">
              <option>Sin marca</option>
              <option>+ Agregar marca…</option>
            </Seleccion>
          </Campo>
        </BloquePanel>

        <BloquePanel titulo="Precio publicado">
          <CampoPrecio aria-label="Precio publicado en bolivianos" defaultValue="180" />
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

  return (
    <Pagina
      titulo="Sistema"
      busqueda={{ accion: "/sistema" }}
    >
      <div className="con-accion-fija">
        {selectorDeVista}
        <MigaDePan
          pasos={[{ texto: "Carteras", href: "/" }, { texto: "Bandoleras" }]}
        />
        <div className="mx-auto max-w-[440px]">
          <div className="mb-s-4">
            <ControlSegmentado
              etiquetadoPor="estado-titulo"
              opciones={[
                { valor: "disponible", texto: "Disponible" },
                { valor: "reservada", texto: "Reservada" },
                { valor: "vendida", texto: "Vendida" },
              ]}
              valor={estado}
              alCambiar={setEstado}
            />
            <span id="estado-titulo" className="sr-only">
              Estado de la pieza
            </span>
          </div>
          <Comprobante etiquetadoPor="ref">
            <EncabezadoComprobante
              codigo="VT-0142"
              id="ref"
              como="h2"
              sello={estados[estado]}
            />
            <NombrePieza>Bandolera de cuero negra</NombrePieza>
            <Renglones>
              <Renglon
                etiqueta="Medidas"
                cifra
                aclaracion="alto × ancho × profundidad, cerrada"
              >
                22 × 30 × 9 cm
              </Renglon>
              <Renglon etiqueta="Tamaño" aclaracion={rangoDeTamano("Mediana", umbrales)}>
                Mediana
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
            <PieComprobante>Publicada 12/09 · DROP #03 · Una sola unidad</PieComprobante>
          </Comprobante>
          <AccionFija>
            {estado === "disponible" ? (
              <BotonWhatsApp
                variante="principal"
                telefono={configuracionTienda.whatsapp}
                codigo="VT-0142"
                nombre="Bandolera de cuero negra"
              />
            ) : (
              <BotonWhatsApp
                variante="secundario"
                href="/"
                texto={
                  estado === "reservada"
                    ? "Avisame si se libera"
                    : "Ver carteras disponibles"
                }
              />
            )}
          </AccionFija>
        </div>
      </div>
    </Pagina>
  );
}
