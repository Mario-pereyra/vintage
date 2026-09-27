import type {
  OrigenDeReserva,
  Prisma,
  PrismaClient,
} from "~/generated/prisma/client";

import { ErrorDeDominio } from "./errores";
import { formatearCodigo, numeroDeCodigo, uuidV7 } from "./identificadores";

/** Lo que las reservas necesitan saber de la tienda y del reloj. */
export interface ConfiguracionDeReservas {
  prefijoDeCodigo: string;
  /** La hora actual. Las pruebas la fijan. */
  ahora: () => Date;
}

/** Dónde nació la reserva, tal como se nombra fuera del dominio. */
export type OrigenDeLaReserva = "live" | "fuera_de_live";

/** Plazo por defecto de una reserva, en minutos, según su origen (ADR 0003). */
export const PLAZO_POR_DEFECTO: Record<OrigenDeLaReserva, number> = {
  live: 15,
  fuera_de_live: 120,
};

/** Tope de un plazo (al crear o al extender): un día. */
const PLAZO_MAXIMO_MINUTOS = 24 * 60;

const ORIGEN: Record<OrigenDeLaReserva, OrigenDeReserva> = {
  live: "LIVE",
  fuera_de_live: "FUERA_DE_LIVE",
};

/**
 * Qué se hace al reservar según las reservas vencidas de la compradora:
 * ninguna, `libre`; con 1, `aviso`; con 2, `pago_previo` (debe pagar antes de
 * reservar); con 3 o más, `bloqueada` (ya no se le reserva).
 */
export type ReglaDeCompradora = "libre" | "aviso" | "pago_previo" | "bloqueada";

export function reglaDeCompradora(reservasVencidas: number): ReglaDeCompradora {
  if (reservasVencidas >= 3) return "bloqueada";
  if (reservasVencidas === 2) return "pago_previo";
  if (reservasVencidas === 1) return "aviso";
  return "libre";
}

/**
 * Una compradora tal como la ve la operadora. `reservasVencidas` es interno:
 * nunca sale del panel.
 */
export interface Compradora {
  id: string;
  nombre: string;
  /** Solo dígitos, con código de país: `59171234567`. */
  whatsapp: string;
  reservasVencidas: number;
  regla: ReglaDeCompradora;
}

/** La compradora de una reserva: una ya registrada o una nueva. */
export type CompradoraDeReserva = { id: string } | { nombre: string; whatsapp: string };

export interface DatosDeReserva {
  /** La pieza, por su código (`VT-0142`). */
  codigo: string;
  compradora: CompradoraDeReserva;
  origen: OrigenDeLaReserva;
  /** Minutos de plazo. Si falta, el del origen (15 o 120). */
  plazoMinutos?: number | null;
  /**
   * La operadora confirma que la compradora paga antes de reservar. Es
   * obligatorio cuando la compradora tiene 2 reservas vencidas.
   */
  pagoPrevio?: boolean;
}

/** Una reserva activa, en el panel. */
export interface ReservaActiva {
  /** Código de la pieza reservada. */
  codigo: string;
  nombrePieza: string | null;
  compradora: Compradora;
  origen: OrigenDeLaReserva;
  conPagoPrevio: boolean;
  creadaEn: Date;
  venceEn: Date;
  /** Minutos que faltan para que venza, redondeados hacia arriba. */
  minutosRestantes: number;
}

export interface DatosDeInteresada {
  nombre: string;
  whatsapp: string;
  nota?: string | null;
}

export interface Interesada {
  id: string;
  nombre: string;
  whatsapp: string;
  nota: string | null;
  creadaEn: Date;
}

// --- Validación ------------------------------------------------------------

/**
 * Deja solo los dígitos. Un número boliviano de 8 dígitos recibe el código de
 * país (591). Devuelve `null` si no parece un número de WhatsApp.
 */
export function normalizarWhatsapp(texto: string): string | null {
  let digitos = texto.replace(/\D/g, "");
  if (digitos.length === 8) digitos = `591${digitos}`;
  return digitos.length >= 10 && digitos.length <= 15 ? digitos : null;
}

function limpiarTexto(texto: string | null | undefined): string {
  return (texto ?? "").trim().replace(/\s+/g, " ");
}

function validarPersona(datos: { nombre: string; whatsapp: string }) {
  const errores: Record<string, string> = {};
  const nombre = limpiarTexto(datos.nombre);
  if (!nombre) errores.nombre = "Escribe el nombre.";
  else if (nombre.length > 80) errores.nombre = "Usa como máximo 80 caracteres.";
  const whatsapp = normalizarWhatsapp(datos.whatsapp ?? "");
  if (!whatsapp) {
    errores.whatsapp = "Escribe un WhatsApp válido: 8 dígitos o con código de país.";
  }
  return { nombre, whatsapp: whatsapp ?? "", errores };
}

function validarPlazo(minutos: number, campo: string) {
  if (!(Number.isInteger(minutos) && minutos > 0 && minutos <= PLAZO_MAXIMO_MINUTOS)) {
    throw new ErrorDeDominio("datos_invalidos", "Revisa el plazo.", {
      [campo]: `Escribe un plazo entre 1 y ${PLAZO_MAXIMO_MINUTOS} minutos.`,
    });
  }
}

// --- Operaciones -----------------------------------------------------------

const conVencidas = {
  _count: { select: { reservas: { where: { estado: "VENCIDA" } } } },
} as const satisfies Prisma.CompradoraInclude;

type FilaDeCompradora = Prisma.CompradoraGetPayload<{ include: typeof conVencidas }>;

const detalleDeReserva = {
  pieza: { select: { codigo: true, nombre: true } },
  compradora: { include: conVencidas },
} as const satisfies Prisma.ReservaInclude;

type FilaDeReserva = Prisma.ReservaGetPayload<{ include: typeof detalleDeReserva }>;

type Cliente = PrismaClient | Prisma.TransactionClient;

/**
 * Busca la compradora elegida (por id) o, si es nueva, la busca por su
 * WhatsApp y la crea si no existe. La usan la reserva y la venta directa.
 */
export async function buscarOCrearCompradora(
  tx: Prisma.TransactionClient,
  datos: CompradoraDeReserva,
  ahora: Date,
): Promise<FilaDeCompradora> {
  if ("id" in datos) {
    const fila = await tx.compradora
      .findUnique({ where: { id: datos.id }, include: conVencidas })
      .catch(() => null); // un id que no es UUID
    if (!fila) {
      throw new ErrorDeDominio("compradora_no_encontrada", "No existe esa compradora.");
    }
    return fila;
  }

  const { nombre, whatsapp, errores } = validarPersona(datos);
  if (Object.keys(errores).length > 0) {
    throw new ErrorDeDominio("datos_invalidos", "Revisa los datos de la compradora.", errores);
  }
  const existente = await tx.compradora.findUnique({
    where: { whatsapp },
    include: conVencidas,
  });
  if (existente) return existente;
  return tx.compradora.create({
    data: { id: uuidV7(ahora.getTime()), nombre, whatsapp },
    include: conVencidas,
  });
}


export function crearReservas(db: PrismaClient, config: ConfiguracionDeReservas) {
  function aCompradora(fila: FilaDeCompradora): Compradora {
    const reservasVencidas = fila._count.reservas;
    return {
      id: fila.id,
      nombre: fila.nombre,
      whatsapp: fila.whatsapp,
      reservasVencidas,
      regla: reglaDeCompradora(reservasVencidas),
    };
  }

  function aReservaActiva(fila: FilaDeReserva): ReservaActiva {
    const ahora = config.ahora();
    return {
      codigo: formatearCodigo(fila.pieza.codigo, config.prefijoDeCodigo),
      nombrePieza: fila.pieza.nombre,
      compradora: aCompradora(fila.compradora),
      origen: fila.origen === "LIVE" ? "live" : "fuera_de_live",
      conPagoPrevio: fila.conPagoPrevio,
      creadaEn: fila.creadaEn,
      venceEn: fila.venceEn,
      minutosRestantes: Math.max(
        0,
        Math.ceil((fila.venceEn.getTime() - ahora.getTime()) / 60_000),
      ),
    };
  }

  async function exigirPieza(cliente: Cliente, codigo: string) {
    const numero = numeroDeCodigo(codigo);
    const pieza =
      numero === null ? null : await cliente.pieza.findUnique({ where: { codigo: numero } });
    if (!pieza) {
      throw new ErrorDeDominio("pieza_no_encontrada", `No existe la pieza ${codigo}.`);
    }
    return pieza;
  }

  async function filaActiva(codigo: string): Promise<FilaDeReserva | null> {
    const pieza = await exigirPieza(db, codigo);
    return db.reserva.findFirst({
      where: { piezaId: pieza.id, estado: "ACTIVA" },
      include: detalleDeReserva,
    });
  }

  async function exigirActiva(codigo: string): Promise<FilaDeReserva> {
    const fila = await filaActiva(codigo);
    if (!fila) {
      throw new ErrorDeDominio(
        "reserva_no_encontrada",
        `La pieza ${codigo} no tiene una reserva activa.`,
      );
    }
    return fila;
  }

  /**
   * Vence las reservas activas cuyo plazo terminó a la hora `ahora`: pasan a
   * VENCIDA (suman al contador de su compradora) y su pieza vuelve a
   * Disponible. Es idempotente y segura ante llamadas simultáneas: una reserva
   * solo se vence una vez. Devuelve cuántas venció esta llamada.
   *
   * El dominio la llama antes de leer u operar sobre piezas y reservas
   * (vencimiento perezoso), así que ninguna lectura ve una reserva vencida
   * como activa aunque no corra ningún barrido periódico.
   */
  async function vencerReservas(ahora: Date = config.ahora()): Promise<number> {
    const vencidas = await db.reserva.findMany({
      where: { estado: "ACTIVA", venceEn: { lte: ahora } },
      select: { id: true, piezaId: true },
    });
    if (vencidas.length === 0) return 0;

    const [reservas] = await db.$transaction([
      db.reserva.updateMany({
        where: { id: { in: vencidas.map((r) => r.id) }, estado: "ACTIVA" },
        data: { estado: "VENCIDA" },
      }),
      // Solo vuelve a Disponible si ya no le queda una reserva activa.
      db.pieza.updateMany({
        where: {
          id: { in: vencidas.map((r) => r.piezaId) },
          estado: "RESERVADA",
          reservas: { none: { estado: "ACTIVA" } },
        },
        data: { estado: "DISPONIBLE" },
      }),
    ]);
    return reservas.count;
  }

  return {
    vencerReservas,

    /** Registra una compradora. Su WhatsApp no puede estar repetido. */
    async registrarCompradora(datos: { nombre: string; whatsapp: string }): Promise<Compradora> {
      const { nombre, whatsapp, errores } = validarPersona(datos);
      if (!errores.whatsapp) {
        const repetida = await db.compradora.findUnique({ where: { whatsapp } });
        if (repetida) {
          errores.whatsapp = `Ese WhatsApp ya es de ${repetida.nombre}.`;
        }
      }
      if (Object.keys(errores).length > 0) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
      }
      const fila = await db.compradora.create({
        data: { id: uuidV7(config.ahora().getTime()), nombre, whatsapp },
        include: conVencidas,
      });
      return aCompradora(fila);
    },

    /**
     * Compradoras cuyo nombre contiene el texto o, si el texto son dígitos,
     * cuyo WhatsApp los contiene. Sin texto, las últimas registradas.
     */
    async buscarCompradoras(texto: string): Promise<Compradora[]> {
      await vencerReservas();
      const limpio = limpiarTexto(texto);
      const digitos = limpio.replace(/\D/g, "");
      const soloNumero = digitos.length > 0 && /^[\d\s+()-]+$/.test(limpio);
      const filas = await db.compradora.findMany({
        where: !limpio
          ? {}
          : soloNumero
            ? { whatsapp: { contains: digitos } }
            : { nombre: { contains: limpio, mode: "insensitive" } },
        include: conVencidas,
        orderBy: { creadaEn: "desc" },
        take: 20,
      });
      return filas.map(aCompradora);
    },

    /** Una compradora por su id, o `null`. */
    async compradora(id: string): Promise<Compradora | null> {
      await vencerReservas();
      const fila = await db.compradora
        .findUnique({ where: { id }, include: conVencidas })
        .catch(() => null); // un id que no es UUID
      return fila ? aCompradora(fila) : null;
    },

    /**
     * Reserva una pieza Disponible para una compradora: la pieza pasa a
     * Reservada hasta que la reserva venza, se cancele o se pague. El plazo
     * por defecto depende del origen (15 minutos en un live, 2 horas fuera).
     *
     * Aplica las reglas del contador de vencidas: con 2 exige `pagoPrevio`,
     * con 3 rechaza. Devuelve la reserva y, si la compradora tiene vencidas,
     * la regla que se le aplicó (`aviso` o `pago_previo`) para mostrarla.
     */
    async reservar(
      datos: DatosDeReserva,
    ): Promise<{ reserva: ReservaActiva; aviso: Exclude<ReglaDeCompradora, "libre" | "bloqueada"> | null }> {
      const origen = ORIGEN[datos.origen];
      if (!origen) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa el origen.", {
          origen: "Elige si la reserva nace de un live o no.",
        });
      }
      const plazo = datos.plazoMinutos ?? PLAZO_POR_DEFECTO[datos.origen];
      validarPlazo(plazo, "plazoMinutos");

      await vencerReservas();
      const ahora = config.ahora();

      const { id, regla } = await db.$transaction(async (tx) => {
        const pieza = await exigirPieza(tx, datos.codigo);
        const compradora = aCompradora(await buscarOCrearCompradora(tx, datos.compradora, config.ahora()));

        if (compradora.regla === "bloqueada") {
          throw new ErrorDeDominio(
            "compradora_bloqueada",
            `${compradora.nombre} tiene ${compradora.reservasVencidas} reservas vencidas: ya no se le reserva.`,
          );
        }
        if (compradora.regla === "pago_previo" && !datos.pagoPrevio) {
          throw new ErrorDeDominio(
            "requiere_pago_previo",
            `${compradora.nombre} tiene 2 reservas vencidas: debe pagar antes de reservar.`,
            { pagoPrevio: "Confirma que la compradora paga antes de reservar." },
          );
        }

        // El filtro por estado garantiza una sola reserva activa por pieza,
        // aunque dos operadoras reserven a la vez.
        const { count } = await tx.pieza.updateMany({
          where: { id: pieza.id, estado: "DISPONIBLE" },
          data: { estado: "RESERVADA" },
        });
        if (count === 0) {
          throw new ErrorDeDominio(
            "transicion_no_permitida",
            pieza.estado === "RESERVADA"
              ? `La pieza ${datos.codigo} ya tiene una reserva activa.`
              : `La pieza ${datos.codigo} no está Disponible.`,
          );
        }

        const reserva = await tx.reserva.create({
          data: {
            id: uuidV7(ahora.getTime()),
            piezaId: pieza.id,
            compradoraId: compradora.id,
            origen,
            conPagoPrevio: compradora.regla === "pago_previo",
            creadaEn: ahora,
            venceEn: new Date(ahora.getTime() + plazo * 60_000),
          },
        });
        return { id: reserva.id, regla: compradora.regla };
      });

      const fila = await db.reserva.findUniqueOrThrow({
        where: { id },
        include: detalleDeReserva,
      });
      return {
        reserva: aReservaActiva(fila),
        aviso: regla === "aviso" || regla === "pago_previo" ? regla : null,
      };
    },

    /** La reserva activa de una pieza, o `null`. */
    async reservaActiva(codigo: string): Promise<ReservaActiva | null> {
      await vencerReservas();
      const fila = await filaActiva(codigo);
      return fila ? aReservaActiva(fila) : null;
    },

    /** Extiende el plazo de la reserva activa de una pieza. */
    async extenderReserva(codigo: string, minutos: number): Promise<ReservaActiva> {
      validarPlazo(minutos, "minutos");
      await vencerReservas();
      const fila = await exigirActiva(codigo);
      const { count } = await db.reserva.updateMany({
        where: { id: fila.id, estado: "ACTIVA" },
        data: { venceEn: new Date(fila.venceEn.getTime() + minutos * 60_000) },
      });
      if (count === 0) {
        throw new ErrorDeDominio(
          "reserva_no_encontrada",
          `La pieza ${codigo} no tiene una reserva activa.`,
        );
      }
      return aReservaActiva(
        await db.reserva.findUniqueOrThrow({ where: { id: fila.id }, include: detalleDeReserva }),
      );
    },

    /**
     * Cancela la reserva activa de una pieza: la pieza vuelve a Disponible y
     * el contador de la compradora no cambia.
     */
    async cancelarReserva(codigo: string): Promise<void> {
      await vencerReservas();
      const fila = await exigirActiva(codigo);
      const [{ count }] = await db.$transaction([
        db.reserva.updateMany({
          where: { id: fila.id, estado: "ACTIVA" },
          data: { estado: "CANCELADA", canceladaEn: config.ahora() },
        }),
        db.pieza.updateMany({
          where: {
            id: fila.piezaId,
            estado: "RESERVADA",
            reservas: { none: { estado: "ACTIVA" } },
          },
          data: { estado: "DISPONIBLE" },
        }),
      ]);
      if (count === 0) {
        throw new ErrorDeDominio(
          "reserva_no_encontrada",
          `La pieza ${codigo} no tiene una reserva activa.`,
        );
      }
    },

    /** Las reservas activas, la que vence primero arriba. */
    async listarReservasActivas(): Promise<ReservaActiva[]> {
      await vencerReservas();
      const filas = await db.reserva.findMany({
        where: { estado: "ACTIVA" },
        include: detalleDeReserva,
        orderBy: { venceEn: "asc" },
      });
      return filas.map(aReservaActiva);
    },

    /** Registra a alguien interesado en una pieza, para contactarlo a mano. */
    async registrarInteresada(codigo: string, datos: DatosDeInteresada): Promise<Interesada> {
      const pieza = await exigirPieza(db, codigo);
      const { nombre, whatsapp, errores } = validarPersona(datos);
      const nota = limpiarTexto(datos.nota) || null;
      if (nota && nota.length > 280) errores.nota = "Usa como máximo 280 caracteres.";
      if (Object.keys(errores).length > 0) {
        throw new ErrorDeDominio("datos_invalidos", "Revisa los datos marcados.", errores);
      }
      const ahora = config.ahora();
      const fila = await db.interesada.create({
        data: { id: uuidV7(ahora.getTime()), piezaId: pieza.id, nombre, whatsapp, nota, creadaEn: ahora },
      });
      return { id: fila.id, nombre, whatsapp, nota, creadaEn: fila.creadaEn };
    },

    /** Las interesadas de una pieza, en orden de registro. */
    async interesadasDePieza(codigo: string): Promise<Interesada[]> {
      const pieza = await exigirPieza(db, codigo);
      const filas = await db.interesada.findMany({
        where: { piezaId: pieza.id },
        orderBy: [{ creadaEn: "asc" }, { id: "asc" }],
      });
      return filas.map(({ id, nombre, whatsapp, nota, creadaEn }) => ({
        id,
        nombre,
        whatsapp,
        nota,
        creadaEn,
      }));
    },
  };
}
