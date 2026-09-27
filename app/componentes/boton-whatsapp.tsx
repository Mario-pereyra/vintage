import type { ReactNode } from "react";

import { Icono } from "./icono";

/** Enlace de WhatsApp con el mensaje precargado. */
export function enlaceWhatsApp(telefono: string, mensaje: string) {
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

type Props =
  | {
      /** Pieza Disponible: botón de tinta con la Ref. y el mensaje precargado. */
      variante: "principal";
      telefono: string;
      codigo: string;
      nombre: string;
      texto?: string;
    }
  | {
      /**
       * Pieza Reservada o Vendida, o una acción sin pieza: botón de papel, sin
       * Ref., con otra acción ("Avisame si se libera", "Ver carteras disponibles").
       */
      variante: "secundario";
      href: string;
      texto: string;
      /** Si abre WhatsApp, muestra el ícono de chat. */
      conChat?: boolean;
    };

/**
 * Botón de WhatsApp con Ref.: la única acción fuerte de la ficha. Envuélvelo
 * en <AccionFija> para la barra fija sobre rosa del celular.
 */
export function BotonWhatsApp(props: Props) {
  if (props.variante === "principal") {
    const href = enlaceWhatsApp(
      props.telefono,
      `Hola, me interesa la Ref. ${props.codigo} (${props.nombre})`,
    );
    return (
      <a className="boton" href={href} target="_blank" rel="noopener">
        <Icono nombre="chat" />
        <span>{props.texto ?? "Escribinos por WhatsApp"}</span>
        <small>Ref. {props.codigo}</small>
      </a>
    );
  }

  const externo = props.href.startsWith("http");
  return (
    <a
      className="boton boton-secundario"
      href={props.href}
      target={externo ? "_blank" : undefined}
      rel={externo ? "noopener" : undefined}
    >
      {props.conChat ? <Icono nombre="chat" /> : null}
      <span>{props.texto}</span>
    </a>
  );
}

/**
 * Barra fija abajo sobre rosa, con divisor de tinta al 20 %. Desde 900px deja
 * de ser fija y queda debajo del comprobante. La página que la use debe dejar
 * lugar abajo (clase `con-accion-fija` en su contenedor).
 */
export function AccionFija({ children }: { children: ReactNode }) {
  return <div className="accion-fija">{children}</div>;
}
