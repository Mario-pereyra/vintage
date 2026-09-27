import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ErrorDeDominio,
  PRECIO_MAXIMO_CENTAVOS,
  TOMAS_REQUERIDAS,
  type DatosDeVenta,
  type Dominio,
} from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

const INICIO = new Date("2026-09-26T14:00:00Z");
const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

describe("ventas, entregas y retiros", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;
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

  async function piezaEnPreparacion(nombre = "Bandolera de cuero negra") {
    const { tipos, colores, materiales } = await dominio.listas();
    const { codigo, rutaPublica } = await dominio.crearPieza({
      nombre,
      tipoId: tipos[0].id,
      colorId: colores[0].id,
      materialId: materiales[0].id,
      altoCm: 22,
      anchoCm: 30,
      profundidadCm: 9,
      precioCentavos: 18000,
    });
    return { codigo, direccion: rutaPublica.split("/").pop()! };
  }

  async function piezaDisponible(nombre?: string) {
    const pieza = await piezaEnPreparacion(nombre);
    for (const tipo of TOMAS_REQUERIDAS) {
      await dominio.agregarFoto(pieza.codigo, tipo, {
        claveMiniatura: `${tipo}-mini.jpg`,
        claveCatalogo: `${tipo}-cat.jpg`,
        claveDetalle: `${tipo}-det.jpg`,
      });
    }
    await dominio.publicarPieza(pieza.codigo);
    return pieza;
  }

  const ANA = { nombre: "Ana Rojas", whatsapp: "71234567" };
  const BEA = { nombre: "Bea Suárez", whatsapp: "77654321" };

  /** Una venta directa válida de `codigo`; `cambios` pisa lo que se quiera probar. */
  function venta(codigo: string, cambios: Partial<DatosDeVenta> = {}): DatosDeVenta {
    return {
      codigo,
      pagoVerificado: true,
      precioFinalCentavos: 15000,
      compradora: ANA,
      canal: "tiktok_live",
      entrega: { modalidad: "delivery_santa_cruz", costoCentavos: 1500 },
      ...cambios,
    };
  }

  async function rechazo(promesa: Promise<unknown>): Promise<ErrorDeDominio> {
    const error = await promesa.then(
      () => null,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ErrorDeDominio);
    return error as ErrorDeDominio;
  }

  async function estado(codigo: string) {
    return (await dominio.piezaDelPanel(codigo))?.estado;
  }

  describe("venta", () => {
    it("directa desde Disponible: con pago verificado la pieza pasa a Vendida y registra la venta", async () => {
      const { codigo } = await piezaDisponible();
      pasan(30);

      const registrada = await dominio.registrarVenta(venta(codigo));

      expect(await estado(codigo)).toBe("vendida");
      expect(registrada).toMatchObject({
        codigo,
        nombrePieza: "Bandolera de cuero negra",
        compradora: { nombre: "Ana Rojas", whatsapp: "59171234567" },
        desdeReserva: false,
        precioFinalCentavos: 15000,
        precioPublicadoCentavos: 18000,
        vendidaEn: ahora,
        canal: "tiktok_live",
        entrega: {
          modalidad: "delivery_santa_cruz",
          costoCentavos: 1500,
          estado: "pendiente",
          guia: null,
          entregadaEn: null,
        },
      });
      expect(await dominio.ventaDePieza(codigo)).toEqual(registrada);
    });

    it("directa con una compradora ya registrada, por su id", async () => {
      const ana = await dominio.registrarCompradora(ANA);
      const { codigo } = await piezaDisponible();

      const registrada = await dominio.registrarVenta(venta(codigo, { compradora: { id: ana.id } }));

      expect(registrada.compradora.id).toBe(ana.id);
    });

    it("desde Reservada: la compradora es la de la reserva, que deja de estar activa sin sumar vencidas", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      pasan(5);

      const registrada = await dominio.registrarVenta(venta(codigo, { compradora: null }));

      expect(await estado(codigo)).toBe("vendida");
      expect(registrada.desdeReserva).toBe(true);
      expect(registrada.compradora.nombre).toBe("Ana Rojas");
      expect(await dominio.reservaActiva(codigo)).toBeNull();
      expect(await dominio.listarReservasActivas()).toEqual([]);

      // Aunque pase el plazo, la reserva pagada no vence.
      pasan(60);
      const [compradora] = await dominio.buscarCompradoras("Ana");
      expect(compradora.reservasVencidas).toBe(0);
      expect(await estado(codigo)).toBe("vendida");
    });

    it("desde Reservada acepta la misma compradora de la reserva y rechaza a otra", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });

      const error = await rechazo(dominio.registrarVenta(venta(codigo, { compradora: BEA })));
      expect(error.motivo).toBe("transicion_no_permitida");
      expect(await estado(codigo)).toBe("reservada");

      const registrada = await dominio.registrarVenta(
        venta(codigo, { compradora: { nombre: "Ana", whatsapp: "+591 7123 4567" } }),
      );
      expect(registrada.compradora.nombre).toBe("Ana Rojas");
    });

    it("con la reserva ya vencida, la pieza está Disponible y se vende directo a cualquiera", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      pasan(16);

      const registrada = await dominio.registrarVenta(venta(codigo, { compradora: BEA }));

      expect(registrada).toMatchObject({ desdeReserva: false, compradora: { nombre: "Bea Suárez" } });
    });

    it("sin pago verificado no hay Vendida", async () => {
      const disponible = await piezaDisponible();
      const reservada = await piezaDisponible("Tote de lona");
      await dominio.reservar({ codigo: reservada.codigo, compradora: ANA, origen: "live" });

      for (const { codigo } of [disponible, reservada]) {
        const error = await rechazo(
          dominio.registrarVenta(venta(codigo, { pagoVerificado: false, compradora: null })),
        );
        expect(error.motivo).toBe("pago_no_verificado");
      }
      expect(await estado(disponible.codigo)).toBe("disponible");
      expect(await estado(reservada.codigo)).toBe("reservada");
      expect(await dominio.reservaActiva(reservada.codigo)).not.toBeNull();
    });

    it("rechaza vender una pieza En preparación, ya Vendida o Retirada", async () => {
      const enPreparacion = await piezaEnPreparacion();
      expect(
        (await rechazo(dominio.registrarVenta(venta(enPreparacion.codigo)))).motivo,
      ).toBe("transicion_no_permitida");

      const vendida = await piezaDisponible();
      await dominio.registrarVenta(venta(vendida.codigo));
      expect(
        (await rechazo(dominio.registrarVenta(venta(vendida.codigo, { compradora: BEA })))).motivo,
      ).toBe("transicion_no_permitida");

      const retirada = await piezaDisponible();
      await dominio.retirarPieza(retirada.codigo, { motivo: "irrecuperable" });
      expect(
        (await rechazo(dominio.registrarVenta(venta(retirada.codigo)))).motivo,
      ).toBe("transicion_no_permitida");
    });

    it("rechaza una pieza que no existe", async () => {
      expect((await rechazo(dominio.registrarVenta(venta("VT-9999")))).motivo).toBe(
        "pieza_no_encontrada",
      );
    });

    it("el precio final puede ser menor que el publicado, pero es un entero positivo y acotado", async () => {
      const { codigo } = await piezaDisponible();

      for (const precioFinalCentavos of [
        0,
        -100,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        PRECIO_MAXIMO_CENTAVOS + 1,
        2 ** 31,
      ]) {
        const error = await rechazo(dominio.registrarVenta(venta(codigo, { precioFinalCentavos })));
        expect(error.motivo).toBe("datos_invalidos");
        expect(error.errores.precioFinalCentavos).toBeDefined();
      }
      expect(await estado(codigo)).toBe("disponible");

      const registrada = await dominio.registrarVenta(venta(codigo, { precioFinalCentavos: 12000 }));
      expect(registrada.precioFinalCentavos).toBe(12000);
    });

    it("la fecha puede ser anterior al registro, pero no futura ni anterior a la publicación", async () => {
      const { codigo } = await piezaDisponible();
      pasan(3 * 24 * 60);

      const futura = await rechazo(
        dominio.registrarVenta(venta(codigo, { fecha: new Date(ahora.getTime() + MINUTO) })),
      );
      expect(futura.errores.fecha).toBeDefined();

      const antesDePublicar = await rechazo(
        dominio.registrarVenta(venta(codigo, { fecha: new Date(INICIO.getTime() - MINUTO) })),
      );
      expect(antesDePublicar.errores.fecha).toBeDefined();

      const invalida = await rechazo(
        dominio.registrarVenta(venta(codigo, { fecha: new Date(Number.NaN) })),
      );
      expect(invalida.errores.fecha).toBeDefined();

      const ayer = new Date(ahora.getTime() - DIA);
      const registrada = await dominio.registrarVenta(venta(codigo, { fecha: ayer }));
      expect(registrada.vendidaEn).toEqual(ayer);
    });

    it("exige un canal de captación de la lista", async () => {
      const { codigo } = await piezaDisponible();
      const error = await rechazo(
        dominio.registrarVenta(venta(codigo, { canal: "whatsapp" as DatosDeVenta["canal"] })),
      );
      expect(error.errores.canal).toBeDefined();

      for (const canal of [
        "tiktok_publicacion",
        "instagram_publicacion",
        "instagram_live",
        "facebook_publicacion",
        "facebook_live",
        "web",
        "recomendacion",
      ] as const) {
        const pieza = await piezaDisponible();
        expect((await dominio.registrarVenta(venta(pieza.codigo, { canal }))).canal).toBe(canal);
      }
    });

    it("en una venta directa exige la compradora, con datos válidos", async () => {
      const { codigo } = await piezaDisponible();

      const sin = await rechazo(dominio.registrarVenta(venta(codigo, { compradora: null })));
      expect(sin.errores.compradora).toBeDefined();

      const mala = await rechazo(
        dominio.registrarVenta(venta(codigo, { compradora: { nombre: "", whatsapp: "12" } })),
      );
      expect(mala.errores).toMatchObject({
        nombre: expect.any(String),
        whatsapp: expect.any(String),
      });

      const inexistente = await rechazo(
        dominio.registrarVenta(
          venta(codigo, { compradora: { id: "00000000-0000-7000-8000-000000000000" } }),
        ),
      );
      expect(inexistente.motivo).toBe("compradora_no_encontrada");
      expect(await estado(codigo)).toBe("disponible");
    });

    it("una compradora que ya no puede reservar sí puede comprar con pago verificado", async () => {
      // Tres reservas vencidas: ya no se le reserva.
      for (let i = 0; i < 3; i++) {
        const { codigo } = await piezaDisponible();
        await dominio.reservar({ codigo, compradora: ANA, origen: "live", pagoPrevio: true });
        pasan(16);
      }
      const { codigo } = await piezaDisponible();

      const registrada = await dominio.registrarVenta(venta(codigo));

      expect(registrada.compradora.nombre).toBe("Ana Rojas");
    });
  });

  describe("entrega", () => {
    it("un retiro no tiene costo; un delivery o un envío pueden tenerlo", async () => {
      const retiro = await piezaDisponible();
      const registrada = await dominio.registrarVenta(
        venta(retiro.codigo, { entrega: { modalidad: "retiro" } }),
      );
      expect(registrada.entrega).toMatchObject({ modalidad: "retiro", costoCentavos: 0 });

      const conCosto = await piezaDisponible();
      const error = await rechazo(
        dominio.registrarVenta(
          venta(conCosto.codigo, { entrega: { modalidad: "retiro", costoCentavos: 1000 } }),
        ),
      );
      expect(error.errores.costoCentavos).toBeDefined();

      const envio = await dominio.registrarVenta(
        venta(conCosto.codigo, {
          entrega: { modalidad: "envio_departamento", costoCentavos: 3000, guia: "Flota Copacabana 1234" },
        }),
      );
      expect(envio.entrega).toMatchObject({
        modalidad: "envio_departamento",
        costoCentavos: 3000,
        guia: "Flota Copacabana 1234",
      });
    });

    it("valida el costo de entrega: entero, no negativo y acotado", async () => {
      const { codigo } = await piezaDisponible();
      for (const costoCentavos of [-1, 0.5, Number.NaN, 1_000_001, 2 ** 31]) {
        const error = await rechazo(
          dominio.registrarVenta(
            venta(codigo, { entrega: { modalidad: "delivery_santa_cruz", costoCentavos } }),
          ),
        );
        expect(error.errores.costoCentavos).toBeDefined();
      }
      const gratis = await dominio.registrarVenta(
        venta(codigo, { entrega: { modalidad: "delivery_santa_cruz" } }),
      );
      expect(gratis.entrega.costoCentavos).toBe(0);
    });

    it("exige una modalidad de la lista", async () => {
      const { codigo } = await piezaDisponible();
      const error = await rechazo(
        dominio.registrarVenta(
          venta(codigo, {
            entrega: { modalidad: "moto" as DatosDeVenta["entrega"]["modalidad"] },
          }),
        ),
      );
      expect(error.errores.modalidad).toBeDefined();
    });

    it("la guía o comprobante es solo de los envíos a otro departamento, y corta", async () => {
      const { codigo } = await piezaDisponible();
      const enDelivery = await rechazo(
        dominio.registrarVenta(
          venta(codigo, { entrega: { modalidad: "delivery_santa_cruz", guia: "123" } }),
        ),
      );
      expect(enDelivery.errores.guia).toBeDefined();

      const larga = await rechazo(
        dominio.registrarVenta(
          venta(codigo, { entrega: { modalidad: "envio_departamento", guia: "x".repeat(121) } }),
        ),
      );
      expect(larga.errores.guia).toBeDefined();
    });

    it("se puede registrar ya entregada (p. ej. un retiro en el momento)", async () => {
      const { codigo } = await piezaDisponible();
      const registrada = await dominio.registrarVenta(
        venta(codigo, { entrega: { modalidad: "retiro", entregada: true } }),
      );
      expect(registrada.entrega).toMatchObject({ estado: "entregada", entregadaEn: ahora });
      expect(await dominio.listarEntregasPendientes()).toEqual([]);
    });

    it("hay una lista de entregas pendientes, la venta más antigua primero", async () => {
      const primera = await piezaDisponible("Primera");
      await dominio.registrarVenta(venta(primera.codigo));
      pasan(10);
      const segunda = await piezaDisponible("Segunda");
      await dominio.registrarVenta(
        venta(segunda.codigo, {
          entrega: { modalidad: "envio_departamento", costoCentavos: 3000 },
        }),
      );
      const entregada = await piezaDisponible("Entregada");
      await dominio.registrarVenta(
        venta(entregada.codigo, { entrega: { modalidad: "retiro", entregada: true } }),
      );

      const pendientes = await dominio.listarEntregasPendientes();

      expect(pendientes.map((v) => v.codigo)).toEqual([primera.codigo, segunda.codigo]);
    });

    it("marcar entregada la saca de pendientes; no se marca dos veces", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.registrarVenta(venta(codigo));
      pasan(60);

      const entregada = await dominio.marcarEntregada(codigo);

      expect(entregada.entrega).toMatchObject({ estado: "entregada", entregadaEn: ahora });
      expect(await dominio.listarEntregasPendientes()).toEqual([]);
      expect((await rechazo(dominio.marcarEntregada(codigo))).motivo).toBe(
        "transicion_no_permitida",
      );
    });

    it("la guía de un envío se puede registrar después", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.registrarVenta(
        venta(codigo, { entrega: { modalidad: "envio_departamento", costoCentavos: 3000 } }),
      );

      const conGuia = await dominio.registrarGuia(codigo, "  Encomienda  Trans Copacabana 88 ");

      expect(conGuia.entrega.guia).toBe("Encomienda Trans Copacabana 88");
      expect((await dominio.listarEntregasPendientes())[0].entrega.guia).toBe(
        "Encomienda Trans Copacabana 88",
      );
    });

    it("no registra guía en una entrega que no es envío, ni en una pieza sin venta", async () => {
      const { codigo } = await piezaDisponible();
      expect((await rechazo(dominio.registrarGuia(codigo, "1"))).motivo).toBe(
        "venta_no_encontrada",
      );
      expect((await rechazo(dominio.marcarEntregada(codigo))).motivo).toBe("venta_no_encontrada");

      await dominio.registrarVenta(venta(codigo));
      expect((await rechazo(dominio.registrarGuia(codigo, "1"))).errores.guia).toBeDefined();
    });
  });

  describe("vendidas visibles", () => {
    it("no aparecen en el listado principal, solo con el filtro «Ver vendidas», con su precio", async () => {
      const disponible = await piezaDisponible("Disponible");
      const vendida = await piezaDisponible("Vendida");
      await dominio.registrarVenta(venta(vendida.codigo, { precioFinalCentavos: 12000 }));

      const principal = await dominio.listarCatalogo();
      expect(principal.piezas.map((p) => p.codigo)).toEqual([disponible.codigo]);

      const vendidas = await dominio.listarCatalogo({ vendidas: true });
      expect(vendidas.piezas).toEqual([
        expect.objectContaining({
          codigo: vendida.codigo,
          estado: "vendida",
          // El precio publicado: el precio final (regateo) es interno.
          precioCentavos: 18000,
        }),
      ]);
    });

    it("«Ver vendidas» combina con los demás filtros y muestra primero la última vendida", async () => {
      const { tipos } = await dominio.listas();
      const primera = await piezaDisponible("Primera");
      const segunda = await piezaDisponible("Segunda");
      await dominio.registrarVenta(venta(segunda.codigo));
      pasan(5);
      await dominio.registrarVenta(venta(primera.codigo));

      const vendidas = await dominio.listarCatalogo({ vendidas: true });
      expect(vendidas.piezas.map((p) => p.codigo)).toEqual([primera.codigo, segunda.codigo]);

      const deOtroTipo = await dominio.listarCatalogo({ vendidas: true, tipoId: tipos[1].id });
      expect(deOtroTipo.piezas).toEqual([]);
    });

    it("la URL de una vendida sigue funcionando y la marca como vendida", async () => {
      const { codigo, direccion } = await piezaDisponible();
      await dominio.registrarVenta(venta(codigo));

      const ficha = await dominio.fichaPublica(direccion);

      expect(ficha).toMatchObject({ codigo, estado: "vendida", precioCentavos: 18000 });
      // Nada de la venta se publica.
      expect(JSON.stringify(ficha)).not.toContain("Ana");
      expect(JSON.stringify(ficha)).not.toContain("15000");
    });
  });

  describe("retiro", () => {
    it("retira una pieza Disponible con un motivo; su URL dice que ya no está disponible", async () => {
      const { codigo, direccion } = await piezaDisponible();
      pasan(10);

      const retiro = await dominio.retirarPieza(codigo, { motivo: "irrecuperable" });

      expect(retiro).toEqual({ codigo, motivo: "irrecuperable", nota: null, retiradaEn: ahora });
      expect(await dominio.retiroDePieza(codigo)).toEqual(retiro);
      expect(await estado(codigo)).toBe("retirada");
      expect((await dominio.fichaPublica(direccion))?.estado).toBe("retirada");
      expect((await dominio.listarCatalogo()).piezas).toEqual([]);
      expect((await dominio.listarCatalogo({ vendidas: true })).piezas).toEqual([]);
    });

    it("retira una pieza En preparación, que nunca llega a ser pública", async () => {
      const { codigo, direccion } = await piezaEnPreparacion();

      await dominio.retirarPieza(codigo, { motivo: "otro", nota: "Se la quedó una amiga" });

      expect(await estado(codigo)).toBe("retirada");
      expect(await dominio.fichaPublica(direccion)).toBeNull();
      expect((await dominio.retiroDePieza(codigo))?.nota).toBe("Se la quedó una amiga");
    });

    it("una pieza incompleta En preparación también se puede retirar", async () => {
      const { codigo, rutaPublica } = await dominio.crearPieza({ nombre: "A medio cargar" });

      await dominio.retirarPieza(codigo, { motivo: "irrecuperable" });

      expect(await estado(codigo)).toBe("retirada");
      expect(await dominio.fichaPublica(rutaPublica.split("/").pop()!)).toBeNull();
    });

    it("rechaza retirar una pieza Reservada, Vendida o ya Retirada", async () => {
      const reservada = await piezaDisponible();
      await dominio.reservar({ codigo: reservada.codigo, compradora: ANA, origen: "live" });
      const vendida = await piezaDisponible();
      await dominio.registrarVenta(venta(vendida.codigo));
      const retirada = await piezaDisponible();
      await dominio.retirarPieza(retirada.codigo, { motivo: "uso_propio" });

      for (const { codigo } of [reservada, vendida, retirada]) {
        const error = await rechazo(dominio.retirarPieza(codigo, { motivo: "irrecuperable" }));
        expect(error.motivo).toBe("transicion_no_permitida");
      }
      expect(await estado(reservada.codigo)).toBe("reservada");
      expect(await estado(vendida.codigo)).toBe("vendida");
      expect((await dominio.retiroDePieza(retirada.codigo))?.motivo).toBe("uso_propio");
    });

    it("una pieza Reservada cuya reserva venció ya está Disponible y se puede retirar", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.reservar({ codigo, compradora: ANA, origen: "live" });
      pasan(16);

      await dominio.retirarPieza(codigo, { motivo: "devuelta_al_proveedor" });

      expect(await estado(codigo)).toBe("retirada");
    });

    it("exige un motivo de la lista; con «otro», una nota; la nota es corta", async () => {
      const { codigo } = await piezaDisponible();

      const sinMotivo = await rechazo(
        dominio.retirarPieza(codigo, { motivo: "aburrida" as "otro" }),
      );
      expect(sinMotivo.errores.motivo).toBeDefined();

      const otroSinNota = await rechazo(dominio.retirarPieza(codigo, { motivo: "otro", nota: "  " }));
      expect(otroSinNota.errores.nota).toBeDefined();

      const larga = await rechazo(
        dominio.retirarPieza(codigo, { motivo: "irrecuperable", nota: "x".repeat(281) }),
      );
      expect(larga.errores.nota).toBeDefined();
      expect(await estado(codigo)).toBe("disponible");
    });
  });

  describe("Vendida y Retirada son estados finales", () => {
    it("una Vendida no se reserva, no se publica ni se retira", async () => {
      const { codigo } = await piezaDisponible();
      await dominio.registrarVenta(venta(codigo));

      expect(
        (await rechazo(dominio.reservar({ codigo, compradora: BEA, origen: "live" }))).motivo,
      ).toBe("transicion_no_permitida");
      expect((await rechazo(dominio.publicarPieza(codigo))).motivo).toBe("transicion_no_permitida");
      expect(
        (await rechazo(dominio.retirarPieza(codigo, { motivo: "irrecuperable" }))).motivo,
      ).toBe("transicion_no_permitida");
      expect(await estado(codigo)).toBe("vendida");
    });

    it("una Retirada no se reserva, no se publica ni se vende", async () => {
      const enPreparacion = await piezaEnPreparacion();
      await dominio.retirarPieza(enPreparacion.codigo, { motivo: "irrecuperable" });
      const { codigo } = enPreparacion;

      expect((await rechazo(dominio.publicarPieza(codigo))).motivo).toBe("transicion_no_permitida");
      expect(
        (await rechazo(dominio.reservar({ codigo, compradora: BEA, origen: "live" }))).motivo,
      ).toBe("transicion_no_permitida");
      expect((await rechazo(dominio.registrarVenta(venta(codigo)))).motivo).toBe(
        "transicion_no_permitida",
      );
      expect(await estado(codigo)).toBe("retirada");
    });
  });
});
