/**
 * Redimensión de fotos en el navegador (ADR 0005): cada foto que sube la
 * operadora genera sus tres variantes en el celular o la PC, sin pasar por el
 * servidor (Workers no puede procesar imágenes dentro de su presupuesto de
 * CPU). Solo se usa desde el panel; no tiene pruebas automáticas (no hay
 * `canvas` en Vitest) y se verifica a mano, como marca CONTEXT.md.
 */

/** Lado máximo (en px) y calidad JPEG de cada variante. */
const VARIANTES = {
  /** Huecos del panel. */
  miniatura: { lado: 320, calidad: 0.8 },
  /** Listado del catálogo y Open Graph. */
  catalogo: { lado: 960, calidad: 0.85 },
  /** Carrusel grande de la ficha pública. */
  detalle: { lado: 1800, calidad: 0.88 },
} as const;

export type VarianteDeFoto = keyof typeof VARIANTES;

export type VariantesDeFoto = Record<VarianteDeFoto, Blob>;

/** Un bitmap reescalado a como mucho `lado` px de su lado más largo. */
async function reescalar(original: ImageBitmap, lado: number): Promise<ImageBitmap> {
  const escala = Math.min(1, lado / Math.max(original.width, original.height));
  if (escala === 1) return original;
  return createImageBitmap(original, {
    resizeWidth: Math.max(1, Math.round(original.width * escala)),
    resizeHeight: Math.max(1, Math.round(original.height * escala)),
    resizeQuality: "high",
  });
}

function aBlobJpeg(bitmap: ImageBitmap, calidad: number): Promise<Blob> {
  const lienzo = document.createElement("canvas");
  lienzo.width = bitmap.width;
  lienzo.height = bitmap.height;
  const contexto = lienzo.getContext("2d");
  if (!contexto) throw new Error("El navegador no puede procesar la foto.");
  contexto.drawImage(bitmap, 0, 0);
  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la foto."))),
      "image/jpeg",
      calidad,
    );
  });
}

/**
 * Genera las tres variantes de una foto a partir del archivo elegido en la
 * cámara o la galería. Cada variante es un JPEG del lado máximo indicado en
 * `VARIANTES`, sin agrandar fotos más chicas.
 */
export async function generarVariantesDeFoto(archivo: File): Promise<VariantesDeFoto> {
  const original = await createImageBitmap(archivo);
  try {
    const entradas = await Promise.all(
      (Object.entries(VARIANTES) as [VarianteDeFoto, (typeof VARIANTES)[VarianteDeFoto]][]).map(
        async ([nombre, { lado, calidad }]) => {
          const bitmap = await reescalar(original, lado);
          const blob = await aBlobJpeg(bitmap, calidad);
          if (bitmap !== original) bitmap.close();
          return [nombre, blob] as const;
        },
      ),
    );
    return Object.fromEntries(entradas) as VariantesDeFoto;
  } finally {
    original.close();
  }
}
