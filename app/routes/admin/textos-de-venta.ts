import type {
  CanalDeLaVenta,
  EstadoDeLaEntrega,
  ModalidadDeLaEntrega,
  MotivoDelRetiro,
} from "~/dominio";

/** Cómo se nombra cada canal de captación en el panel, en el orden del selector. */
export const TEXTO_DEL_CANAL: Record<CanalDeLaVenta, string> = {
  tiktok_live: "TikTok · live",
  tiktok_publicacion: "TikTok · publicación",
  instagram_live: "Instagram · live",
  instagram_publicacion: "Instagram · publicación",
  facebook_live: "Facebook · live",
  facebook_publicacion: "Facebook · publicación",
  web: "Web",
  recomendacion: "Recomendación",
};

export const TEXTO_DE_LA_MODALIDAD: Record<ModalidadDeLaEntrega, string> = {
  retiro: "Retiro",
  delivery_santa_cruz: "Delivery en Santa Cruz",
  envio_departamento: "Envío a otro departamento",
};

export const TEXTO_DEL_ESTADO_DE_ENTREGA: Record<EstadoDeLaEntrega, string> = {
  pendiente: "Pendiente",
  entregada: "Entregada",
};

export const TEXTO_DEL_MOTIVO: Record<MotivoDelRetiro, string> = {
  irrecuperable: "Irrecuperable",
  devuelta_al_proveedor: "Devuelta al proveedor",
  uso_propio: "Uso propio",
  otro: "Otro",
};

/** 15000 → "150", 15050 → "150,50". */
export function bolivianos(centavos: number): string {
  return (centavos / 100).toLocaleString("es-BO", {
    minimumFractionDigits: centavos % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** "26/09/2026", en hora de Bolivia. */
export function fechaDeBolivia(valor: Date): string {
  return valor.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/La_Paz",
  });
}
