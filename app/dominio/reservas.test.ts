import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ErrorDeDominio, TOMAS_REQUERIDAS, type Dominio } from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

const INICIO = new Date("2026-09-26T14:00:00Z");
const MINUTO = 60_000;

describe("reservas", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;
  /** El reloj del dominio: cada prueba lo adelanta con `pasan(minutos)`. */
  let ahora: Date;

  beforeEach(async () => {
    ahora = INICIO;
    base = await crearBaseDePrueba({ ahora: () => ahora });
    dominio = base.dominio;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  function pasan(minutos: number) {
    ahora = new Date(ahora.getTime() + minutos * MINUTO);
  }

  /** Una pieza publicada (Disponible), con sus datos obligatorios completos. */
  async function piezaDisponible(nombre = "Bandolera de cuero negra") {
    const { tipos, colores, materiales } = await dominio.listas();
    const { codigo } = await dominio.crearPieza({
      nombre,
      tipoId: tipos[0].id,
      colorId: colores[0].id,
      materialId: materiales[0].id,
      altoCm: 22,
      anchoCm: 30,
      profundidadCm: 9,
      precioCentavos: 18000,
    });
    for (const tipo of TOMAS_REQUERIDAS) {
      await dominio.agregarFoto(codigo, tipo, {
        claveMiniatura: `${tipo}-mini.jpg`,
        claveCatalogo: `${tipo}-cat.jpg`,
        claveDetalle: `${tipo}-det.jpg`,
      });
    }
    const publicada = await dominio.publicarPieza(codigo);
    const direccion = publicada.rutaPublica.split("/").pop()!;
    return { codigo, direccion };
  }

  const ANA = { nombre: "Ana Rojas", whatsapp: "+591 712 34567" };

  async function rechazo(promesa: Promise<unknown>): Promise<ErrorDeDominio> {
    const error = await promesa.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ErrorDeDominio);
    return error as ErrorDeDominio;
  }

  /** Reserva y deja vencer la reserva: suma una vencida a la compradora. */
  async function dejarVencer(whatsapp = ANA.whatsapp) {
    const { codigo } = await piezaDisponible();
    const { reserva } = await dominio.reservar({
      codigo,
      compradora: { nombre: "Ana Rojas", whatsapp },
      origen: "live",
      pagoPrevio: true,
    });
    ahora = reserva.venceEn;
    await dominio.vencerReservas(ahora);
  }

  describe("compradora", () => {
    it("se registra con nombre y WhatsApp, que se guarda solo con dígitos y código de país", async () => {
      const ana = await dominio.registrarCompradora(ANA);

      expect(ana).toMatchObject({
        nombre: "Ana Rojas",
        whatsapp: "59171234567",
        reservasVencidas: 0,
        regla: "libre",
      });
      expect(await dominio.registrarCompradora({ nombre: "Bea", whatsapp: "69647971" }))
        .toMatchObject({ whatsapp: "59169647971" });
    });

    it("su WhatsApp es único", async () => {
      await dominio.registrarCompradora(ANA);

      const error = await rechazo(
        dominio.registrarCompradora({ nombre: "Otra", whatsapp: "71234567" }),
      );
      expect(error.motivo).toBe("datos_invalidos");
      expect(error.errores.whatsapp).toBeDefined();
    });

    it("exige nombre y un WhatsApp válido", async () => {
      const error = await rechazo(
        dominio.registrarCompradora({ nombre: " ", whatsapp: "12" }),
      );
      expect(Object.keys(error.errores).sort()).toEqual(["nombre", "whatsapp"]);
    });

    it("se busca por nombre o por WhatsApp", async () => {
      await dominio.registrarCompradora(ANA);
      await dominio.registrarCompradora({ nombre: "Beatriz Paz", whatsapp: "76543210" });

      expect((await dominio.buscarCompradoras("ana")).map((c) => c.nombre)).toEqual([
        "Ana Rojas",
      ]);
      expect((await dominio.buscarCompradoras("765 43")).map((c) => c.nombre)).toEqual([
        "Beatriz Paz",
      ]);
    });
  });

  describe("reservar", () => {
    it("pasa la pieza de Disponible a Reservada y la ficha pública lo muestra", async () => {
      const { codigo, direccion } = await piezaDisponible();

      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("reservada");
      expect((await dominio.fichaPublica(direccion))?.estado).toBe("reservada");
      expect((await dominio.listarCatalogo()).piezas.map((p) => p.estado)).toEqual(["reservada"]);
    });

    it("la ficha pública dice hasta qué hora está reservada, y nada de la compradora", async () => {
      const { codigo, direccion } = await piezaDisponible();
      expect((await dominio.fichaPublica(direccion))?.reservadaHasta).toBeNull();

      const { reserva } = await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      expect((await dominio.fichaPublica(direccion))?.reservadaHasta).toEqual(reserva.venceEn);
    });

    it("dura 15 minutos si nace de un live", async () => {
      const { codigo } = await piezaDisponible();

      const { reserva } = await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      expect(reserva.venceEn).toEqual(new Date(INICIO.getTime() + 15 * MINUTO));
      expect(reserva.minutosRestantes).toBe(15);
    });

    it("dura 2 horas si nace fuera de un live", async () => {
      const { codigo } = await piezaDisponible();

      const { reserva } = await dominio.reservar({
        codigo,
        compradora: ANA,
        origen: "fuera_de_live",
      });

      expect(reserva.venceEn).toEqual(new Date(INICIO.getTime() + 120 * MINUTO));
    });

    it("el plazo se puede ajustar al crearla", async () => {
      const { codigo } = await piezaDisponible();

      const { reserva } = await dominio.reservar({
        codigo,
        compradora: ANA,
        origen: "live",
        plazoMinutos: 45,
      });

      expect(reserva.venceEn).toEqual(new Date(INICIO.getTime() + 45 * MINUTO));
    });

    it("rechaza un plazo que no es un número de minutos razonable", async () => {
      const { codigo } = await piezaDisponible();

      const error = await rechazo(
        dominio.reservar({ codigo, compradora: ANA, origen: "live", plazoMinutos: 0 }),
      );
      expect(error.errores.plazoMinutos).toBeDefined();
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
    });

    it("crea a la compradora al vuelo, o reutiliza la que ya tiene ese WhatsApp", async () => {
      const { codigo: primera } = await piezaDisponible();
      const { codigo: segunda } = await piezaDisponible("Tote de lona");

      const a = await dominio.reservar({ codigo: primera, compradora: ANA, origen: "live" });
      const b = await dominio.reservar({
        codigo: segunda,
        compradora: { nombre: "Ana R.", whatsapp: "71234567" },
        origen: "live",
      });

      expect(b.reserva.compradora.id).toBe(a.reserva.compradora.id);
      expect(await dominio.buscarCompradoras("")).toHaveLength(1);
    });

    it("acepta una compradora ya registrada por su id", async () => {
      const { codigo } = await piezaDisponible();
      const ana = await dominio.registrarCompradora(ANA);

      const { reserva } = await dominio.reservar({
        codigo,
        compradora: { id: ana.id },
        origen: "live",
      });

      expect(reserva.compradora).toMatchObject({ id: ana.id, nombre: "Ana Rojas" });
    });

    it("una pieza no admite una segunda reserva activa", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      const error = await rechazo(
        dominio.reservar({
          codigo,
          compradora: { nombre: "Bea", whatsapp: "76543210" },
          origen: "live",
        }),
      );

      expect(error.motivo).toBe("transicion_no_permitida");
      expect(await dominio.listarReservasActivas()).toHaveLength(1);
    });

    it("una pieza En preparación no se reserva", async () => {
      const { codigo } = await dominio.crearPieza({ nombre: "Clutch" });

      const error = await rechazo(dominio.reservar({ codigo, compradora: ANA, origen: "live" }));

      expect(error.motivo).toBe("transicion_no_permitida");
    });

    it("una pieza que no existe no se reserva", async () => {
      const error = await rechazo(
        dominio.reservar({ codigo: "VT-0999", compradora: ANA, origen: "live" }),
      );

      expect(error.motivo).toBe("pieza_no_encontrada");
    });
  });

  describe("extender y cancelar", () => {
    it("extender suma minutos al vencimiento", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      pasan(10);

      const reserva = await dominio.extenderReserva(codigo, 30);

      expect(reserva.venceEn).toEqual(new Date(INICIO.getTime() + 45 * MINUTO));
      expect(reserva.minutosRestantes).toBe(35);
    });

    it("una reserva vencida ya no se extiende", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      pasan(15);

      const error = await rechazo(dominio.extenderReserva(codigo, 30));

      expect(error.motivo).toBe("reserva_no_encontrada");
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
    });

    it("cancelar devuelve la pieza a Disponible sin sumar al contador", async () => {
      const { codigo } = await piezaDisponible();
      const { reserva } = await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      await dominio.cancelarReserva(codigo);

      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
      expect(await dominio.reservaActiva(codigo)).toBeNull();
      expect((await dominio.compradora(reserva.compradora.id))?.reservasVencidas).toBe(0);
    });

    it("cancelar una pieza sin reserva activa se rechaza", async () => {
      const { codigo } = await piezaDisponible();

      const error = await rechazo(dominio.cancelarReserva(codigo));

      expect(error.motivo).toBe("reserva_no_encontrada");
    });

    it("tras cancelar, la pieza se puede volver a reservar", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      await dominio.cancelarReserva(codigo);

      await dominio.reservar({
        codigo,
        compradora: { nombre: "Bea", whatsapp: "76543210" },
        origen: "live",
      });

      expect((await dominio.reservaActiva(codigo))?.compradora.nombre).toBe("Bea");
    });
  });

  describe("vencimiento", () => {
    it("vencer recibe la hora: antes del plazo no vence; al cumplirse, sí", async () => {
      const { codigo } = await piezaDisponible();
      const { reserva } = await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      expect(await dominio.vencerReservas(new Date(INICIO.getTime() + 14 * MINUTO))).toBe(0);
      expect(await dominio.vencerReservas(reserva.venceEn)).toBe(1);

      pasan(15);
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
      expect((await dominio.compradora(reserva.compradora.id))?.reservasVencidas).toBe(1);
    });

    it("vence sola al leer la pieza, la ficha o el catálogo (sin barrido)", async () => {
      const { codigo, direccion } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "fuera_de_live" });

      pasan(119);
      expect((await dominio.fichaPublica(direccion))?.estado).toBe("reservada");

      pasan(1);
      expect((await dominio.fichaPublica(direccion))?.estado).toBe("disponible");
      expect((await dominio.listarCatalogo()).piezas.map((p) => p.estado)).toEqual(["disponible"]);
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
    });

    it("al vencer, la pieza se puede reservar para otra compradora", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      pasan(20);

      const { reserva } = await dominio.reservar({
        codigo,
        compradora: { nombre: "Bea", whatsapp: "76543210" },
        origen: "live",
      });

      expect(reserva.compradora.nombre).toBe("Bea");
      expect((await dominio.buscarCompradoras("ana"))[0].reservasVencidas).toBe(1);
    });

    it("vencer dos veces cuenta la reserva una sola vez", async () => {
      await dejarVencer();

      expect(await dominio.vencerReservas(ahora)).toBe(0);
      expect((await dominio.buscarCompradoras("ana"))[0].reservasVencidas).toBe(1);
    });

    it("el contador de vencidas nunca llega a la ficha pública", async () => {
      await dejarVencer();
      const { codigo, direccion } = await piezaDisponible("Tote de lona");
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      const ficha = JSON.stringify(await dominio.fichaPublica(direccion));

      expect(ficha).not.toMatch(/vencid|compradora|whatsapp|59171234567/i);
    });
  });

  describe("reglas del contador de vencidas", () => {
    it("sin vencidas, reserva sin aviso", async () => {
      const { codigo } = await piezaDisponible();

      const { aviso } = await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      expect(aviso).toBeNull();
    });

    it("con 1 vencida, reserva con un aviso", async () => {
      await dejarVencer();
      const { codigo } = await piezaDisponible();

      const { aviso } = await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      expect(aviso).toBe("aviso");
      expect((await dominio.buscarCompradoras("ana"))[0].regla).toBe("aviso");
    });

    it("con 2 vencidas, exige pago previo", async () => {
      await dejarVencer();
      await dejarVencer();
      const { codigo } = await piezaDisponible();

      const error = await rechazo(dominio.reservar({ codigo, compradora: ANA, origen: "live" }));
      expect(error.motivo).toBe("requiere_pago_previo");
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");

      const { reserva, aviso } = await dominio.reservar({
        codigo,
        compradora: ANA,
        origen: "live",
        pagoPrevio: true,
      });
      expect(aviso).toBe("pago_previo");
      expect(reserva.conPagoPrevio).toBe(true);
    });

    it("con 3 vencidas, no se permite reservar", async () => {
      await dejarVencer();
      await dejarVencer();
      await dejarVencer();
      const { codigo } = await piezaDisponible();

      const error = await rechazo(
        dominio.reservar({ codigo, compradora: ANA, origen: "live", pagoPrevio: true }),
      );

      expect(error.motivo).toBe("compradora_bloqueada");
      expect((await dominio.buscarCompradoras("ana"))[0].regla).toBe("bloqueada");
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
    });
  });

  describe("lista de reservas activas", () => {
    it("ordena por vencimiento, con el tiempo restante, y omite las vencidas", async () => {
      const { codigo: tarde } = await piezaDisponible("Tote de lona");
      const { codigo: pronto } = await piezaDisponible("Clutch dorado");
      const { codigo: cae } = await piezaDisponible("Bandolera roja");
      await dominio.reservar({ codigo: tarde, compradora: ANA, origen: "fuera_de_live" });
      await dominio.reservar({
        codigo: pronto,
        compradora: { nombre: "Bea", whatsapp: "76543210" },
        origen: "live",
      });
      await dominio.reservar({
        codigo: cae,
        compradora: { nombre: "Cata", whatsapp: "70000000" },
        origen: "live",
        plazoMinutos: 5,
      });
      pasan(5);

      const activas = await dominio.listarReservasActivas();

      expect(
        activas.map((r) => [r.codigo, r.nombrePieza, r.compradora.nombre, r.minutosRestantes]),
      ).toEqual([
        [pronto, "Clutch dorado", "Bea", 10],
        [tarde, "Tote de lona", "Ana Rojas", 115],
      ]);
    });
  });

  describe("interesadas", () => {
    it("se registran en una pieza y se ven al volver a Disponible", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      await dominio.registrarInteresada(codigo, {
        nombre: "Bea",
        whatsapp: "76543210",
        nota: "Comentó «mía» en el live",
      });
      pasan(1);
      await dominio.registrarInteresada(codigo, { nombre: "Cata", whatsapp: "70000000" });
      pasan(14);

      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("disponible");
      expect(await dominio.interesadasDePieza(codigo)).toEqual([
        expect.objectContaining({
          nombre: "Bea",
          whatsapp: "59176543210",
          nota: "Comentó «mía» en el live",
        }),
        expect.objectContaining({ nombre: "Cata", whatsapp: "59170000000", nota: null }),
      ]);
    });

    it("exigen nombre y WhatsApp", async () => {
      const { codigo } = await piezaDisponible();

      const error = await rechazo(
        dominio.registrarInteresada(codigo, { nombre: "", whatsapp: "" }),
      );

      expect(Object.keys(error.errores).sort()).toEqual(["nombre", "whatsapp"]);
    });
  });
});
