import type {
  CanalDeCaptacion,
  EstadoEntrega,
  ModalidadDeEntrega,
  Prisma,
  PrismaClient,
} from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";
import { esUuidValido, formatearCodigo, numeroDeCodigo, uuidV7 } from "./identificadores";
import { PRECIO_MAXIMO_CENTAVOS } from "./piezas";
import { buscarOCrearCompradora, normalizarWhatsapp, type CompradoraDeReserva } from "./reservas";

/** Lo que las ventas necesitan saber de la tienda y del reloj. */
export interface ConfiguracionDeVentas {
  prefijoDeCodigo: string;
  /** La hora actual. Las pruebas la fijan. */
  ahora: () => Date;
}

/** Canal de captación, tal como se nombra fuera del dominio. */
export type CanalDeLaVenta =
  | "tiktok_publicacion"
  | "tiktok_live"
  | "instagram_publicacion"
  | "instagram_live"
  | "facebook_publicacion"
  | "facebook_live"
  | "web"
  | "recomendacion";

/** Modalidad de entrega, tal como se nombra fuera del dominio. */
export type ModalidadDeLaEntrega = "retiro" | "delivery_santa_cruz" | "envio_departamento";

export type EstadoDeLaEntrega = "pendiente" | "entregada";

const CANAL: Record<CanalDeLaVenta, CanalDeCaptacion> = {
  tiktok_publicacion: "TIKTOK_PUBLICACION",
  tiktok_live: "TIKTOK_LIVE",
  instagram_publicacion: "INSTAGRAM_PUBLICACION",
  instagram_live: "INSTAGRAM_LIVE",
  facebook_publicacion: "FACEBOOK_PUBLICACION",
  facebook_live: "FACEBOOK_LIVE",
  web: "WEB",
  recomendacion: "RECOMENDACION",
};

const MODALIDAD: Record<ModalidadDeLaEntrega, ModalidadDeEntrega> = {
  retiro: "RETIRO",
  delivery_santa_cruz: "DELIVERY_SANTA_CRUZ",
  envio_departamento: "ENVIO_DEPARTAMENTO",
};

const nombreDeCanal = invertir(CANAL);
const nombreDeModalidad = invertir(MODALIDAD);
const nombreDeEstadoDeEntrega: Record<EstadoEntrega, EstadoDeLaEntrega> = {
  PENDIENTE: "pendiente",
  ENTREGADA: "entregada",
};

function invertir<K extends string, V extends string>(registro: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(registro).map(([k, v]) => [v, k])) as Record<V, K>;
}

/** El canal, si es uno de la lista (cuidando que no sea una clave heredada). */
function canalValido(canal: string): CanalDeCaptacion | undefined {
  return Object.hasOwn(CANAL, canal) ? CANAL[canal as CanalDeLaVenta] : undefined;
}

function modalidadValida(modalidad: string): ModalidadDeEntrega | undefined {
  return Object.hasOwn(MODALIDAD, modalidad)
    ? MODALIDAD[modalidad as ModalidadDeLaEntrega]
    : undefined;
}

/**
 * Tope del costo de una entrega: Bs 10.000, en centavos. Muy por encima de
 * cualquier envío y muy por debajo del máximo de la columna (INTEGER).
 */
export const COSTO_DE_ENTREGA_MAXIMO_CENTAVOS = 1_000_000;

/** Largo máximo de la guía o comprobante de un envío. */
const GUIA_MAXIMA = 120;

export interface DatosDeEntrega {
  modalidad: ModalidadDeLaEntrega;
  /** Lo que cuesta la entrega a la tienda, en centavos. Si falta, 0. Un retiro no tiene costo. */
  costoCentavos?: number | null;
  /** Guía o comprobante; solo de un envío a otro departamento. */
  guia?: string | null;
  /** Ya se entregó al registrar la venta (p. ej. un retiro en el momento). */
  entregada?: boolean;
}

export interface DatosDeVenta {
  /** La pieza, por su código (`VT-0142`). */
  codigo: string;
  /**
   * La operadora confirma que vio el pago en la cuenta del banco. Una captura
   * no basta: sin esto no hay venta.
   */
  pagoVerificado: boolean;
  /** Centavos. Puede ser menor que el precio publicado. */
  precioFinalCentavos: number;
  /** Fecha de la venta. Si falta, ahora. No puede ser futura ni anterior a la publicación. */
  fecha?: Date | null;
  /**
   * En una venta directa (pieza Disponible), la compradora: una registrada o
   * una nueva. En una pieza Reservada es la de la reserva: se puede omitir, y
   * si se da, debe ser la misma.
   */
  compradora?: CompradoraDeReserva | null;
  canal: CanalDeLaVenta;
  entrega: DatosDeEntrega;
}

export interface Entrega {
  modalidad: ModalidadDeLaEntrega;
  costoCentavos: number;
  estado: EstadoDeLaEntrega;
  guia: string | null;
  entregadaEn: Date | null;
}

/** Una venta, en el panel. Nada de esto se publica. */
export interface Venta {
  /** Código de la pieza vendida. */
  codigo: string;
  nombrePieza: string | null;
  compradora: { id: string; nombre: string; whatsapp: string };
  /** La venta cerró una reserva (que pasó a pagada). */
  desdeReserva: boolean;
  precioFinalCentavos: number;
  /** El precio publicado al momento de consultar, para compararlo con el final. */
  precioPublicadoCentavos: number | null;
  vendidaEn: Date;
  canal: CanalDeLaVenta;
  entrega: Entrega;
}

// --- Validación ------------------------------------------------------------

function limpiarTexto(texto: string | null | undefined): string {
  return (texto ?? "").trim().replace(/\s+/g, " ");
}

function validarGuia(guia: string | null | undefined): { guia: string | null; error?: string } {
  const limpia = limpiarTexto(guia) || null;
  if (limpia && limpia.length > GUIA_MAXIMA) {
    return { guia: limpia, error: `Usa como máximo ${GUIA_MAXIMA} caracteres.` };
  }
  return { guia: limpia };
}

interface VentaValidada {
  precioFinalCentavos: number;
  fecha: Date | null;
  canal: CanalDeCaptacion;
  modalidad: ModalidadDeEntrega;
  costoCentavos: number;
  guia: string | null;
}

/** Valida todo lo que no depende de la pieza. */
function validarVenta(datos: DatosDeVenta, ahora: Date): VentaValidada {
  const errores: Record<string, string> = {};

  const precio = datos.precioFinalCentavos;
  if (!(Number.isSafeInteger(precio) && precio > 0 && precio <= PRECIO_MAXIMO_CENTAVOS)) {
    errores.precioFinalCentavos = `Escribe un precio mayor que 0 y de hasta Bs ${(
      PRECIO_MAXIMO_CENTAVOS / 100
    ).toLocaleString("es-BO")}.`;
  }

  const fecha = datos.fecha ?? null;
  if (fecha !== null) {
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) {
      errores.fecha = "Escribe una fecha válida.";
    } else if (fecha.getTime() > ahora.getTime()) {
      errores.fecha = "La fecha de la venta no puede ser futura.";
    }
  }

  const canal = canalValido(String(datos.canal));
  if (!canal) errores.canal = "Elige el canal por el que llegó la compradora.";

  const entrega = datos.entrega ?? ({} as DatosDeEntrega);
  const modalidad = modalidadValida(String(entrega.modalidad));
  if (!modalidad) errores.modalidad = "Elige cómo se entrega la pieza.";

  const costo = entrega.costoCentavos ?? 0;
  if (
    !(Number.isSafeInteger(costo) && costo >= 0 && costo <= COSTO_DE_ENTREGA_MAXIMO_CENTAVOS)
  ) {
    errores.costoCentavos = `Escribe un costo de Bs 0 a ${(
      COSTO_DE_ENTREGA_MAXIMO_CENTAVOS / 100
    ).toLocaleString("es-BO")}.`;
  } else if (modalidad === "RETIRO" && costo !== 0) {
    errores.costoCentavos = "Un retiro no tiene costo de entrega.";
  }

  const { guia, error: errorDeGuia } = validarGuia(entrega.guia);
  if (errorDeGuia) errores.guia = errorDeGuia;
  else if (guia && modalidad && modalidad !== "ENVIO_DEPARTAMENTO") {
    errores.guia = "La guía o comprobante es solo de los envíos a otro departamento.";
  }

  if (Object.keys(errores).length > 0) {
    throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
  }
  return {
    precioFinalCentavos: precio,
    fecha,
    canal: canal!,
    modalidad: modalidad!,
    costoCentavos: costo,
    guia,
  };
}

// --- Operaciones -----------------------------------------------------------

const detalleDeVenta = {
  pieza: { select: { codigo: true, nombre: true, precioCentavos: true } },
  compradora: { select: { id: true, nombre: true, whatsapp: true } },
} as const satisfies Prisma.VentaInclude;

type FilaDeVenta = Prisma.VentaGetPayload<{ include: typeof detalleDeVenta }>;

export function crearVentas(db: PrismaClient, config: ConfiguracionDeVentas) {
  const codigoDe = (numero: number) => formatearCodigo(numero, config.prefijoDeCodigo);

  function aVenta(fila: FilaDeVenta): Venta {
    return {
      codigo: codigoDe(fila.pieza.codigo),
      nombrePieza: fila.pieza.nombre,
      compradora: fila.compradora,
      desdeReserva: fila.reservaId !== null,
      precioFinalCentavos: fila.precioFinalCentavos,
      precioPublicadoCentavos: fila.pieza.precioCentavos,
      vendidaEn: fila.vendidaEn,
      canal: nombreDeCanal[fila.canal],
      entrega: {
        modalidad: nombreDeModalidad[fila.modalidadDeEntrega],
        costoCentavos: fila.costoEntregaCentavos,
        estado: nombreDeEstadoDeEntrega[fila.estadoDeEntrega],
        guia: fila.guia,
        entregadaEn: fila.entregadaEn,
      },
    };
  }

  async function exigirPieza(cliente: PrismaClient | Prisma.TransactionClient, codigo: string) {
    const numero = numeroDeCodigo(codigo);
    const pieza =
      numero === null ? null : await cliente.pieza.findUnique({ where: { codigo: numero } });
    if (!pieza) {
      throw new ErrorDeDominio("pieza_no_encontrada", `No existe la pieza ${codigo}.`);
    }
    return pieza;
  }

  async function filaDeVenta(codigo: string): Promise<FilaDeVenta | null> {
    const pieza = await exigirPieza(db, codigo);
    return db.venta.findUnique({ where: { piezaId: pieza.id }, include: detalleDeVenta });
  }

  async function exigirVenta(codigo: string): Promise<FilaDeVenta> {
    const fila = await filaDeVenta(codigo);
    if (!fila) {
      throw new ErrorDeDominio("venta_no_encontrada", `La pieza ${codigo} no tiene una venta.`);
    }
    return fila;
  }

  /** ¿Es la misma compradora de la reserva? Por id o por WhatsApp. */
  function esLaDeLaReserva(
    datos: CompradoraDeReserva,
    deLaReserva: { id: string; whatsapp: string },
  ): boolean {
    if ("id" in datos) return datos.id === deLaReserva.id;
    return normalizarWhatsapp(datos.whatsapp ?? "") === deLaReserva.whatsapp;
  }

  return {
    /**
     * Registra la venta de una pieza con pago verificado, junto con su
     * entrega: la pieza pasa a Vendida, que es un estado final.
     *
     * - Desde Reservada: la compradora es la de la reserva, que pasa a pagada
     *   (deja de estar activa y no vence).
     * - Desde Disponible (venta directa): exige la compradora; si es nueva, se
     *   registra. Las reglas de reservas vencidas no se aplican: el pago ya
     *   está verificado.
     *
     * El dominio vence antes las reservas cuyo plazo terminó (`trasVencer`):
     * una reserva vencida no se paga, la pieza ya está Disponible.
     */
    async registrarVenta(datos: DatosDeVenta): Promise<Venta> {
      if (datos.pagoVerificado !== true) {
        throw new ErrorDeDominio(
          "pago_no_verificado",
          "Verifica el pago en el banco antes de registrar la venta: una captura no basta.",
          { pagoVerificado: "Confirma que viste el pago en la cuenta del banco." },
        );
      }
      const ahora = config.ahora();
      const validada = validarVenta(datos, ahora);

      const id = await db.$transaction(async (tx) => {
        const pieza = await exigirPieza(tx, datos.codigo);
        const codigo = codigoDe(pieza.codigo);

        if (pieza.estado !== "DISPONIBLE" && pieza.estado !== "RESERVADA") {
          throw new ErrorDeDominio(
            "transicion_no_permitida",
            pieza.estado === "EN_PREPARACION"
              ? `La pieza ${codigo} no está publicada: no se puede vender.`
              : `La pieza ${codigo} ya está ${pieza.estado === "VENDIDA" ? "vendida" : "retirada"}.`,
          );
        }

        if (validada.fecha && pieza.publicadaEn && validada.fecha < pieza.publicadaEn) {
          throw new ErrorDeDominio("datos_invalidos", "Revisa la fecha.", {
            fecha: "La venta no puede ser anterior a la publicación de la pieza.",
          });
        }

        let compradoraId: string;
        let reservaId: string | null = null;

        if (pieza.estado === "RESERVADA") {
          const reserva = await tx.reserva.findFirst({
            where: { piezaId: pieza.id, estado: "ACTIVA", venceEn: { gt: ahora } },
            include: { compradora: true },
          });
          if (!reserva) {
            throw new ErrorDeDominio(
              "reserva_no_encontrada",
              `La pieza ${codigo} no tiene una reserva activa.`,
            );
          }
          if (datos.compradora && !esLaDeLaReserva(datos.compradora, reserva.compradora)) {
            throw new ErrorDeDominio(
              "transicion_no_permitida",
              `La pieza ${codigo} está reservada para ${reserva.compradora.nombre}: cancela la reserva para venderla a otra compradora.`,
            );
          }
          const { count } = await tx.reserva.updateMany({
            where: { id: reserva.id, estado: "ACTIVA" },
            data: { estado: "PAGADA" },
          });
          if (count === 0) {
            throw new ErrorDeDominio(
              "reserva_no_encontrada",
              `La pieza ${codigo} no tiene una reserva activa.`,
            );
          }
          compradoraId = reserva.compradoraId;
          reservaId = reserva.id;
        } else {
          if (!datos.compradora) {
            throw new ErrorDeDominio("datos_invalidos", "Falta la compradora.", {
              compradora: "Elige o anota a la compradora.",
            });
          }
          compradoraId = (await buscarOCrearCompradora(tx, datos.compradora, ahora)).id;
        }

        // El filtro por estado evita dos ventas (o una venta y un retiro) a la vez.
        const { count } = await tx.pieza.updateMany({
          where: { id: pieza.id, estado: pieza.estado },
          data: { estado: "VENDIDA" },
        });
        if (count === 0) {
          throw new ErrorDeDominio(
            "transicion_no_permitida",
            `La pieza ${codigo} cambió de estado mientras se registraba la venta.`,
          );
        }

        const entregada = datos.entrega.entregada === true;
        const venta = await tx.venta.create({
          data: {
            id: uuidV7(ahora.getTime()),
            piezaId: pieza.id,
            compradoraId,
            reservaId,
            precioFinalCentavos: validada.precioFinalCentavos,
            vendidaEn: validada.fecha ?? ahora,
            canal: validada.canal,
            pagoVerificadoEn: ahora,
            modalidadDeEntrega: validada.modalidad,
            costoEntregaCentavos: validada.costoCentavos,
            estadoDeEntrega: entregada ? "ENTREGADA" : "PENDIENTE",
            guia: validada.guia,
            entregadaEn: entregada ? ahora : null,
            creadaEn: ahora,
          },
        });
        return venta.id;
      });

      return aVenta(
        await db.venta.findUniqueOrThrow({ where: { id }, include: detalleDeVenta }),
      );
    },

    /** La venta de una pieza, o `null` si no está vendida. */
    async ventaDePieza(codigo: string): Promise<Venta | null> {
      const fila = await filaDeVenta(codigo);
      return fila ? aVenta(fila) : null;
    },

    /** Marca entregada la pieza vendida. Una entrega se marca una sola vez. */
    async marcarEntregada(codigo: string): Promise<Venta> {
      const fila = await exigirVenta(codigo);
      const { count } = await db.venta.updateMany({
        where: { id: fila.id, estadoDeEntrega: "PENDIENTE" },
        data: { estadoDeEntrega: "ENTREGADA", entregadaEn: config.ahora() },
      });
      if (count === 0) {
        throw new ErrorDeDominio(
          "transicion_no_permitida",
          `La pieza ${codigo} ya estaba entregada.`,
        );
      }
      return aVenta(
        await db.venta.findUniqueOrThrow({ where: { id: fila.id }, include: detalleDeVenta }),
      );
    },

    /** Registra o cambia la guía o comprobante de un envío a otro departamento. */
    async registrarGuia(codigo: string, texto: string | null): Promise<Venta> {
      const fila = await exigirVenta(codigo);
      const { guia, error } = validarGuia(texto);
      if (error || fila.modalidadDeEntrega !== "ENVIO_DEPARTAMENTO") {
        throw new ErrorDeDominio("datos_invalidos", "Revisa la guía.", {
          guia: error ?? "La guía o comprobante es solo de los envíos a otro departamento.",
        });
      }
      return aVenta(
        await db.venta.update({ where: { id: fila.id }, data: { guia }, include: detalleDeVenta }),
      );
    },

    /**
     * Las compras de una compradora, la más reciente primero: su historial en
     * el panel (#13). Un id que no existe (o que no es un UUID) trae una
     * lista vacía.
     */
    async comprasDeCompradora(compradoraId: string): Promise<Venta[]> {
      if (!esUuidValido(compradoraId)) return [];
      const filas = await db.venta.findMany({
        where: { compradoraId },
        include: detalleDeVenta,
        orderBy: [{ vendidaEn: "desc" }, { id: "desc" }],
      });
      return filas.map(aVenta);
    },

    /** Las ventas con la entrega pendiente, la más antigua primero. */
    async listarEntregasPendientes(): Promise<Venta[]> {
      const filas = await db.venta.findMany({
        where: { estadoDeEntrega: "PENDIENTE" },
        include: detalleDeVenta,
        orderBy: [{ vendidaEn: "asc" }, { id: "asc" }],
      });
      return filas.map(aVenta);
    },
  };
}
