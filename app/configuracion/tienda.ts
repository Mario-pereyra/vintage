import type { UmbralesDeTamano } from "~/dominio/tamano";

/**
 * Configuración de la tienda que la operadora puede ajustar sin tocar los
 * componentes. Los componentes reciben estos valores por props; ninguno los
 * tiene fijos.
 */
export const configuracionTienda = {
  /** Wordmark en la cabecera pública, el panel, el `<title>` y el manifest. */
  marca: "Vintage Secret's",
  /**
   * Número de WhatsApp de la tienda, en formato internacional sin "+". La
   * variable WHATSAPP_NUMBER del Worker lo reemplaza si está definida.
   */
  whatsapp: "59169647971",
  /**
   * Umbrales de tamaño por ancho en cm (valores iniciales de PRODUCT.md):
   * Mini menos de 18, Pequeña de 18 a 24, Mediana de 25 a 32 y Grande más de 32.
   */
  umbralesDeTamano: {
    pequenaDesde: 18,
    medianaDesde: 25,
    grandeDesde: 33,
  } satisfies UmbralesDeTamano as UmbralesDeTamano,
} as const;

/** Título de pestaña con el wordmark: "Catálogo · Vintage Secret's". */
export function tituloDePagina(titulo?: string) {
  return titulo
    ? `${titulo} · ${configuracionTienda.marca}`
    : configuracionTienda.marca;
}
