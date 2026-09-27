import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { diasPublicada } from "./consultas";
import { TOMAS_REQUERIDAS, type CondicionDePieza, type Dominio } from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

const INICIO = new Date("2026-09-26T14:00:00Z");
const MINUTO = 60_000;

describe("días publicada (función pura)", () => {
  it("cuenta días de calendario en Bolivia (UTC−4), no bloques de 24 horas", () => {
    // Publicada 26/09 22:00 en Bolivia (27/09 02:00 UTC), vendida 27/09 01:00
    // en Bolivia (27/09 05:00 UTC): mismo día UTC, pero cambia de día en
    // Bolivia con solo 3 horas de diferencia real.
    const publicadaEn = new Date("2026-09-27T02:00:00Z");
    const vendidaEn = new Date("2026-09-27T05:00:00Z");

    expect(diasPublicada(publicadaEn, vendidaEn)).toBe(1);
  });

  it("cuenta 0 si se vende el mismo día de Bolivia, aunque pasen varias horas", () => {
    const publicadaEn = new Date("2026-09-26T14:00:00Z"); // 10:00 en Bolivia
    const vendidaEn = new Date("2026-09-26T20:00:00Z"); // 16:00 en Bolivia

    expect(diasPublicada(publicadaEn, vendidaEn)).toBe(0);
  });

  it("cuenta varios días completos", () => {
    const publicadaEn = new Date("2026-09-01T14:00:00Z");
    const vendidaEn = new Date("2026-09-10T14:00:00Z");

    expect(diasPublicada(publicadaEn, vendidaEn)).toBe(9);
  });
});

describe("consultas del inventario del panel", () => {
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

  async function piezaEnPreparacion(
    nombre = "Bandolera de cuero negra",
    extra: Partial<Parameters<Dominio["crearPieza"]>[0]> = {},
  ) {
    const { tipos, colores, materiales } = await dominio.listas();
    return dominio.crearPieza({
      nombre,
      tipoId: tipos[0].id,
      colorId: colores[0].id,
      materialId: materiales[0].id,
      altoCm: 22,
      anchoCm: 30,
      profundidadCm: 9,
      precioCentavos: 18000,
      ...extra,
    });
  }

  async function piezaDisponible(
    nombre?: string,
    extra: Partial<Parameters<Dominio["crearPieza"]>[0]> = {},
  ) {
    const pieza = await piezaEnPreparacion(nombre, extra);
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

  describe("búsqueda por código", () => {
    it("encuentra por código completo, sin distinguir mayúsculas", async () => {
      const primera = await piezaEnPreparacion("Primera");
      await piezaEnPreparacion("Segunda");

      const encontradas = await dominio.buscarInventario({ texto: primera.codigo.toLowerCase() });

      expect(encontradas.map((p) => p.codigo)).toEqual([primera.codigo]);
    });

    it("encuentra por un fragmento de los dígitos, como el mismo dígito final", async () => {
      const primera = await piezaEnPreparacion("Primera"); // VT-0001
      const segunda = await piezaEnPreparacion("Segunda"); // VT-0002

      // "2" es un fragmento de "0002": el mismo mecanismo que "142" en el
      // ticket (parcial de "VT-0142"), con menos piezas de prueba.
      const encontradas = await dominio.buscarInventario({ texto: "2" });

      expect(encontradas.map((p) => p.codigo)).toEqual([segunda.codigo]);
      expect(primera.codigo).not.toContain("2");
    });

    it("sin texto, trae todo; un texto absurdamente largo se acota, no rompe la consulta", async () => {
      await piezaEnPreparacion("Pieza");

      const sinTexto = await dominio.buscarInventario();
      expect(sinTexto).toHaveLength(1);

      const conTextoLargo = await dominio.buscarInventario({ texto: "x".repeat(500) });
      expect(conTextoLargo).toEqual([]);
    });
  });

  describe("agrupación por estado", () => {
    it("incluye piezas de cualquier estado, a diferencia del catálogo público", async () => {
      await piezaEnPreparacion("En preparación");
      const disponible = await piezaDisponible("Disponible");

      const encontradas = await dominio.buscarInventario();

      expect(encontradas.map((p) => [p.nombre, p.estado]).sort()).toEqual(
        [
          ["Disponible", "disponible"],
          ["En preparación", "en_preparacion"],
        ].sort(),
      );
      expect(await dominio.listarCatalogo()).toEqual({
        piezas: [
          expect.objectContaining({ codigo: disponible.codigo }),
        ],
        hayMas: false,
      });
    });
  });

  describe("filtros", () => {
    async function unLoteAbierto(condicionesDeIngreso: CondicionDePieza[]) {
      const proveedor = await dominio.registrarProveedor({
        nombre: "Textiles del Sur",
        contacto: "+591 700 00000",
      });
      const { calidadesDeclaradas } = await dominio.listas();
      const lote = await dominio.registrarLote({
        proveedorId: proveedor.id,
        canal: "fardo_cerrado",
        calidadDeclaradaId: calidadesDeclaradas[0].id,
        costoCentavos: 10000,
        fechaCompra: new Date("2026-09-01T00:00:00Z"),
      });
      const { piezas } = await dominio.abrirLote(lote.id, {
        fecha: new Date("2026-09-02T00:00:00Z"),
        unidadesRecibidas: condicionesDeIngreso.length,
        descartes: 0,
        condicionesDeIngreso,
      });
      return { lote, piezas };
    }

    it("filtra por lote", async () => {
      const { lote, piezas: piezasDelLote } = await unLoteAbierto(["excelente", "buena"]);
      await piezaEnPreparacion("Suelta, sin lote");

      const encontradas = await dominio.buscarInventario({ loteId: lote.id });

      expect(encontradas.map((p) => p.codigo).sort()).toEqual(
        piezasDelLote.map((p) => p.codigo).sort(),
      );
    });

    it("filtra por tipo", async () => {
      const { tipos } = await dominio.listas();
      await piezaEnPreparacion("Bandolera", { tipoId: tipos[0].id });
      await piezaEnPreparacion("Tote", { tipoId: tipos[1].id });

      const encontradas = await dominio.buscarInventario({ tipoId: tipos[1].id });

      expect(encontradas.map((p) => p.nombre)).toEqual(["Tote"]);
    });

    it("filtra por condición de ingreso", async () => {
      const { piezas } = await unLoteAbierto(["excelente", "con_detalles"]);

      const encontradas = await dominio.buscarInventario({ condicionIngreso: "con_detalles" });

      expect(encontradas.map((p) => p.codigo)).toEqual([piezas[1].codigo]);
      expect(encontradas[0].condicionIngreso).toBe("con_detalles");
    });

    it("combina filtros y texto a la vez", async () => {
      const { tipos } = await dominio.listas();
      await piezaEnPreparacion("Bandolera", { tipoId: tipos[0].id }); // VT-0001
      const tote = await piezaEnPreparacion("Tote", { tipoId: tipos[1].id }); // VT-0002

      const encontradas = await dominio.buscarInventario({ tipoId: tipos[1].id, texto: "2" });

      expect(encontradas.map((p) => p.codigo)).toEqual([tote.codigo]);
    });

    // Los filtros llegan de parámetros de la URL: un valor fuera de rango no
    // debe romper la consulta (mismo cuidado que en `catalogo.ts`).
    describe("filtros fuera de rango", () => {
      it("ignora un loteId o un tipoId que no entra en una columna INTEGER", async () => {
        await piezaEnPreparacion("Pieza");

        const porLote = await dominio.buscarInventario({ loteId: 99_999_999_999 });
        const porTipo = await dominio.buscarInventario({ tipoId: -5 });

        expect(porLote.map((p) => p.nombre)).toEqual(["Pieza"]);
        expect(porTipo.map((p) => p.nombre)).toEqual(["Pieza"]);
      });

      it("ignora una condición de ingreso que no es de la lista", async () => {
        await piezaEnPreparacion("Pieza");

        const encontradas = await dominio.buscarInventario({
          condicionIngreso: "impecable" as CondicionDePieza,
        });

        expect(encontradas.map((p) => p.nombre)).toEqual(["Pieza"]);
      });
    });
  });

  describe("días que estuvo publicada cada pieza vendida", () => {
    it("es null mientras no está Vendida", async () => {
      await piezaEnPreparacion("En preparación");
      await piezaDisponible("Disponible");

      const encontradas = await dominio.buscarInventario();

      expect(encontradas.every((p) => p.diasPublicada === null)).toBe(true);
    });

    it("se calcula desde la publicación hasta la venta, en calendario de Bolivia", async () => {
      // Publicada 27/09 02:00 UTC (26/09 22:00 en Bolivia).
      ahora = new Date("2026-09-27T02:00:00Z");
      const { codigo } = await piezaDisponible("Bandolera");

      // Vendida 27/09 05:00 UTC (27/09 01:00 en Bolivia): un día distinto en
      // Bolivia, aunque solo pasaron 3 horas reales.
      ahora = new Date("2026-09-27T05:00:00Z");
      await dominio.registrarVenta({
        codigo,
        pagoVerificado: true,
        precioFinalCentavos: 15000,
        compradora: { nombre: "Ana Rojas", whatsapp: "71234567" },
        canal: "web",
        entrega: { modalidad: "retiro" },
      });

      const [pieza] = await dominio.buscarInventario({ texto: codigo });

      expect(pieza.diasPublicada).toBe(1);
    });

    it("cuenta varios días completos", async () => {
      const { codigo } = await piezaDisponible("Bandolera");
      pasan(5 * 24 * 60);

      await dominio.registrarVenta({
        codigo,
        pagoVerificado: true,
        precioFinalCentavos: 15000,
        compradora: { nombre: "Ana Rojas", whatsapp: "71234567" },
        canal: "web",
        entrega: { modalidad: "retiro" },
      });

      const [pieza] = await dominio.buscarInventario({ texto: codigo });

      expect(pieza.diasPublicada).toBe(5);
    });
  });
});

describe("historial de compradora", () => {
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

  async function piezaDisponible(nombre: string) {
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
    await dominio.publicarPieza(codigo);
    return codigo;
  }

  it("trae sus compras y sus reservas vencidas, la más reciente primero", async () => {
    const ana = await dominio.registrarCompradora({ nombre: "Ana Rojas", whatsapp: "71234567" });

    const vencida = await piezaDisponible("Se le venció");
    await dominio.reservar({ codigo: vencida, compradora: { id: ana.id }, origen: "live" });
    pasan(16);
    await dominio.vencerReservas(ahora);

    const primera = await piezaDisponible("Primera compra");
    await dominio.registrarVenta({
      codigo: primera,
      pagoVerificado: true,
      precioFinalCentavos: 10000,
      compradora: { id: ana.id },
      canal: "web",
      entrega: { modalidad: "retiro" },
    });
    pasan(60);
    const segunda = await piezaDisponible("Segunda compra");
    await dominio.registrarVenta({
      codigo: segunda,
      pagoVerificado: true,
      precioFinalCentavos: 20000,
      compradora: { id: ana.id },
      canal: "web",
      entrega: { modalidad: "retiro" },
    });

    const historial = await dominio.historialDeCompradora(ana.id);

    expect(historial?.compradora.nombre).toBe("Ana Rojas");
    expect(historial?.compras.map((v) => v.codigo)).toEqual([segunda, primera]);
    expect(historial?.reservasVencidas.map((r) => r.codigo)).toEqual([vencida]);
  });

  it("no confunde reservas activas, canceladas o pagadas con vencidas", async () => {
    const ana = await dominio.registrarCompradora({ nombre: "Ana Rojas", whatsapp: "71234567" });
    const activa = await piezaDisponible("Activa");
    await dominio.reservar({ codigo: activa, compradora: { id: ana.id }, origen: "live" });

    const historial = await dominio.historialDeCompradora(ana.id);

    expect(historial?.reservasVencidas).toEqual([]);
    expect(historial?.compras).toEqual([]);
  });

  it("devuelve null si la compradora no existe", async () => {
    expect(
      await dominio.historialDeCompradora("00000000-0000-7000-8000-000000000000"),
    ).toBeNull();
    expect(await dominio.historialDeCompradora("no-es-un-uuid")).toBeNull();
  });
});
