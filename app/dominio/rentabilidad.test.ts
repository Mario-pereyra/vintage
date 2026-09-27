import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ErrorDeDominio,
  TOMAS_REQUERIDAS,
  type CondicionDePieza,
  type Dominio,
  type Proveedor,
} from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

const AHORA = new Date("2026-09-27T15:00:00Z");

/**
 * Escenario base (lote A, del proveedor «Textiles del Sur», calidad declarada
 * Primera): costo Bs 1.000 + transporte Bs 200 = 120.000 centavos. Llegaron 6
 * unidades, 2 descartes: 4 piezas, reparto de 30.000 cada una.
 *
 * - P1, excelente, tipo 0, sin reacondicionamiento: vendida en 50.000 con
 *   entrega de 1.500.
 * - P2, muy buena, tipo 0, reacondicionamiento 2.000: vendida en 40.000, retiro
 *   sin costo de entrega.
 * - P3, buena, tipo 1, reacondicionamiento 1.000: Disponible, sin vender.
 * - P4, con detalles, tipo 1: retirada como irrecuperable.
 *
 * Costo imputado = 120.000 + 3.000 + 1.500 = 124.500. Ingresos = 90.000.
 */
describe("rentabilidad por lote y proveedor", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;
  let tipos: { id: number; nombre: string }[];

  beforeEach(async () => {
    base = await crearBaseDePrueba({ ahora: () => AHORA });
    dominio = base.dominio;
    tipos = (await dominio.listas()).tipos;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  async function calidad(nombre: string): Promise<number> {
    const { calidadesDeclaradas } = await dominio.listas();
    return calidadesDeclaradas.find((c) => c.nombre === nombre)!.id;
  }

  async function proveedor(nombre: string): Promise<Proveedor> {
    return dominio.registrarProveedor({ nombre, contacto: "69600001" });
  }

  async function loteAbierto(
    prov: Proveedor,
    {
      costo,
      transporte = 0,
      unidades,
      descartes = 0,
      condiciones,
      calidadDeclarada = "Primera",
      fechaCompra = new Date("2026-09-01T00:00:00Z"),
    }: {
      costo: number;
      transporte?: number;
      unidades: number;
      descartes?: number;
      condiciones: CondicionDePieza[];
      calidadDeclarada?: string;
      fechaCompra?: Date;
    },
  ) {
    const lote = await dominio.registrarLote({
      proveedorId: prov.id,
      canal: "fardo_cerrado",
      calidadDeclaradaId: await calidad(calidadDeclarada),
      costoCentavos: costo,
      transporteCentavos: transporte,
      fechaCompra,
    });
    const { piezas } = await dominio.abrirLote(lote.id, {
      fecha: new Date("2026-09-05T00:00:00Z"),
      unidadesRecibidas: unidades,
      descartes,
      condicionesDeIngreso: condiciones,
    });
    return { lote, codigos: piezas.map((p) => p.codigo) };
  }

  /** Completa los datos, sube las 8 tomas y publica la pieza. */
  async function publicar(codigo: string, tipo: number, reacondicionamiento = 0) {
    const { colores, materiales } = await dominio.listas();
    await dominio.editarPieza(codigo, {
      nombre: "Cartera de prueba",
      tipoId: tipos[tipo].id,
      colorId: colores[0].id,
      materialId: materiales[0].id,
      altoCm: 20,
      anchoCm: 30,
      profundidadCm: 10,
      precioCentavos: 60000,
      costoReacondicionamientoCentavos: reacondicionamiento,
    });
    for (const toma of TOMAS_REQUERIDAS) {
      await dominio.agregarFoto(codigo, toma, {
        claveMiniatura: `${codigo}-${toma}-m.jpg`,
        claveCatalogo: `${codigo}-${toma}-c.jpg`,
        claveDetalle: `${codigo}-${toma}-d.jpg`,
      });
    }
    await dominio.publicarPieza(codigo);
  }

  async function vender(codigo: string, precio: number, entrega: number) {
    await dominio.registrarVenta({
      codigo,
      pagoVerificado: true,
      precioFinalCentavos: precio,
      compradora: { nombre: "Ana Rojas", whatsapp: "71234567" },
      canal: "tiktok_live",
      entrega: entrega > 0
        ? { modalidad: "delivery_santa_cruz", costoCentavos: entrega }
        : { modalidad: "retiro", costoCentavos: 0 },
    });
  }

  /** Arma el lote A del escenario base. */
  async function loteA(prov?: Proveedor) {
    const dueño = prov ?? (await proveedor("Textiles del Sur"));
    const { lote, codigos } = await loteAbierto(dueño, {
      costo: 100000,
      transporte: 20000,
      unidades: 6,
      descartes: 2,
      condiciones: ["excelente", "muy_buena", "buena", "con_detalles"],
    });
    const [p1, p2, p3, p4] = codigos;
    await publicar(p1, 0);
    await publicar(p2, 0, 2000);
    await publicar(p3, 1, 1000);
    await dominio.editarPieza(p4, { tipoId: tipos[1].id });
    await vender(p1, 50000, 1500);
    await vender(p2, 40000, 0);
    await dominio.retirarPieza(p4, { motivo: "irrecuperable" });
    return { lote, proveedor: dueño, codigos };
  }

  describe("un lote", () => {
    it("en curso: % recuperado = ingresos ÷ (costo + transporte + reacondicionamientos + entregas), y piezas restantes", async () => {
      const { lote } = await loteA();

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad).toMatchObject({
        id: lote.id,
        proveedorNombre: "Textiles del Sur",
        calidadDeclaradaNombre: "Primera",
        estado: "en_curso",
        costoLoteCentavos: 120000,
        reacondicionamientoCentavos: 3000,
        entregasCentavos: 1500,
        costoImputadoCentavos: 124500,
        ingresosCentavos: 90000,
        margenCentavos: -34500,
        // 90.000 ÷ 124.500 = 72,289… %
        porcentajeRecuperado: 72.3,
        piezas: 4,
        vendidas: 2,
        retiradas: 1,
        sinVender: 1,
      });
    });

    it("terminado: rentabilidad = ingresos − el mismo total, cuando ya no quedan piezas sin vender", async () => {
      const { lote, codigos } = await loteA();
      await dominio.retirarPieza(codigos[2], { motivo: "uso_propio" });

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad).toMatchObject({
        estado: "terminado",
        costoImputadoCentavos: 124500,
        ingresosCentavos: 90000,
        margenCentavos: -34500,
        vendidas: 2,
        retiradas: 2,
        sinVender: 0,
      });
    });

    it("un lote terminado con ganancia", async () => {
      const prov = await proveedor("Fardos Norte");
      const { lote, codigos } = await loteAbierto(prov, {
        costo: 10000,
        unidades: 2,
        condiciones: ["buena", "buena"],
      });
      await publicar(codigos[0], 0);
      await publicar(codigos[1], 0);
      await vender(codigos[0], 8000, 500);
      await vender(codigos[1], 9000, 500);

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad).toMatchObject({
        estado: "terminado",
        costoImputadoCentavos: 11000,
        ingresosCentavos: 17000,
        margenCentavos: 6000,
        porcentajeRecuperado: 154.5,
      });
    });

    it("un lote sin abrir: todo su costo invertido, nada recuperado y sin calidad detectada", async () => {
      const prov = await proveedor("Fardos Norte");
      const lote = await dominio.registrarLote({
        proveedorId: prov.id,
        canal: "lote_clasificado",
        calidadDeclaradaId: await calidad("Segunda"),
        costoCentavos: 5000,
        transporteCentavos: 700,
        fechaCompra: new Date("2026-09-10T00:00:00Z"),
      });

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad).toMatchObject({
        estado: "sin_abrir",
        costoImputadoCentavos: 5700,
        ingresosCentavos: 0,
        margenCentavos: -5700,
        porcentajeRecuperado: 0,
        piezas: 0,
        calidadDetectada: { porcentajeDescarte: null },
      });
    });

    it("desglosa por tipo de cartera: cada pieza carga su reparto, su reacondicionamiento y su entrega", async () => {
      const { lote } = await loteA();

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad?.porTipo).toEqual([
        {
          nombre: tipos[0].nombre,
          piezas: 2,
          vendidas: 2,
          retiradas: 0,
          sinVender: 0,
          ingresosCentavos: 90000,
          // 2 × 30.000 + 2.000 + 1.500
          costoImputadoCentavos: 63500,
          margenCentavos: 26500,
        },
        {
          nombre: tipos[1].nombre,
          piezas: 2,
          vendidas: 0,
          retiradas: 1,
          sinVender: 1,
          ingresosCentavos: 0,
          // 2 × 30.000 + 1.000
          costoImputadoCentavos: 61000,
          margenCentavos: -61000,
        },
      ]);
    });

    it("desglosa por condición de ingreso, en el orden de la escala", async () => {
      const { lote } = await loteA();

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(
        rentabilidad?.porCondicion.map((f) => [
          f.condicion,
          f.ingresosCentavos,
          f.costoImputadoCentavos,
          f.margenCentavos,
        ]),
      ).toEqual([
        ["excelente", 50000, 31500, 18500],
        ["muy_buena", 40000, 32000, 8000],
        ["buena", 0, 31000, -31000],
        ["con_detalles", 0, 30000, -30000],
      ]);
    });

    it("calidad detectada: distribución de condiciones de ingreso y % de descarte, con las irrecuperables como descarte", async () => {
      const { lote } = await loteA();

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad?.calidadDetectada).toEqual({
        condiciones: { excelente: 1, muy_buena: 1, buena: 1, con_detalles: 1 },
        sinCondicion: 0,
        unidadesRecibidas: 6,
        // 2 descartes de la apertura + 1 retirada irrecuperable
        descartes: 3,
        porcentajeDescarte: 50,
      });
    });

    it("una pieza retirada por otro motivo no cuenta como descarte", async () => {
      const { lote, codigos } = await loteA();
      await dominio.retirarPieza(codigos[2], { motivo: "devuelta_al_proveedor" });

      const rentabilidad = await dominio.rentabilidadDeLote(lote.id);

      expect(rentabilidad?.calidadDetectada.descartes).toBe(3);
    });

    it("devuelve null si el lote no existe o el id no es un entero válido", async () => {
      expect(await dominio.rentabilidadDeLote(999)).toBeNull();
      expect(await dominio.rentabilidadDeLote(0)).toBeNull();
      expect(await dominio.rentabilidadDeLote(-3)).toBeNull();
      expect(await dominio.rentabilidadDeLote(1.5)).toBeNull();
      expect(await dominio.rentabilidadDeLote(Number.NaN)).toBeNull();
      // Mayor que un int4 de Postgres: no debe llegar a la consulta.
      expect(await dominio.rentabilidadDeLote(2 ** 31)).toBeNull();
    });
  });

  describe("todos los lotes", () => {
    it("lista la rentabilidad de cada lote, los últimos registrados primero", async () => {
      const { lote: a } = await loteA();
      const prov = await proveedor("Fardos Norte");
      const { lote: b } = await loteAbierto(prov, {
        costo: 10000,
        unidades: 1,
        condiciones: ["excelente"],
      });

      const lotes = await dominio.rentabilidadDeLotes();

      expect(lotes.map((l) => [l.id, l.estado, l.costoImputadoCentavos])).toEqual([
        [b.id, "en_curso", 10000],
        [a.id, "en_curso", 124500],
      ]);
    });

    it("filtra por fecha de compra, con las dos puntas incluidas", async () => {
      const prov = await proveedor("Fardos Norte");
      const fechas = ["2026-08-31", "2026-09-01", "2026-09-30", "2026-10-01"];
      for (const fecha of fechas) {
        await loteAbierto(prov, {
          costo: 1000,
          unidades: 1,
          condiciones: ["buena"],
          fechaCompra: new Date(`${fecha}T00:00:00Z`),
        });
      }

      const lotes = await dominio.rentabilidadDeLotes({
        desde: new Date("2026-09-01T00:00:00Z"),
        hasta: new Date("2026-09-30T00:00:00Z"),
      });

      expect(lotes.map((l) => l.fechaCompra.toISOString().slice(0, 10))).toEqual([
        "2026-09-30",
        "2026-09-01",
      ]);
    });

    it("rechaza fechas inválidas, fuera de rango o invertidas", async () => {
      const rechazo = async (filtros: Parameters<Dominio["rentabilidadDeLotes"]>[0]) => {
        const error = await dominio.rentabilidadDeLotes(filtros).then(
          () => null,
          (e: unknown) => e,
        );
        expect(error).toBeInstanceOf(ErrorDeDominio);
        return (error as ErrorDeDominio).errores;
      };

      expect(await rechazo({ desde: new Date("no es fecha") })).toHaveProperty("desde");
      expect(await rechazo({ hasta: new Date("1990-01-01T00:00:00Z") })).toHaveProperty("hasta");
      expect(await rechazo({ desde: new Date("2300-01-01T00:00:00Z") })).toHaveProperty("desde");
      expect(
        await rechazo({
          desde: new Date("2026-09-10T00:00:00Z"),
          hasta: new Date("2026-09-01T00:00:00Z"),
        }),
      ).toHaveProperty("hasta");
    });
  });

  describe("un proveedor", () => {
    it("su rentabilidad es el agregado de sus lotes y de sus compras a particular", async () => {
      const { proveedor: prov } = await loteA();
      // Lote B del mismo proveedor: 10.000, 2 piezas vendidas en 8.000 y 9.000 con 500 de entrega cada una.
      const { codigos } = await loteAbierto(prov, {
        costo: 10000,
        unidades: 2,
        condiciones: ["buena", "buena"],
        calidadDeclarada: "Segunda",
      });
      await publicar(codigos[0], 0);
      await publicar(codigos[1], 0);
      await vender(codigos[0], 8000, 500);
      await vender(codigos[1], 9000, 500);
      // Una compra a particular: 3.000, sin vender.
      await dominio.registrarCompraAParticular({
        proveedorId: prov.id,
        costoDirectoCentavos: 3000,
        condicionIngreso: "excelente",
      });

      const rentabilidad = await dominio.rentabilidadDeProveedor(prov.id);

      expect(rentabilidad).toMatchObject({
        id: prov.id,
        nombre: "Textiles del Sur",
        lotes: 2,
        comprasAParticular: 1,
        // 124.500 + 11.000 + 3.000
        costoImputadoCentavos: 138500,
        // 90.000 + 17.000
        ingresosCentavos: 107000,
        margenCentavos: -31500,
        // 107.000 ÷ 138.500 = 77,256… %
        porcentajeRecuperado: 77.3,
        piezas: 7,
        vendidas: 4,
        retiradas: 1,
        sinVender: 2,
      });
      expect(rentabilidad?.detalleDeLotes.map((l) => l.costoImputadoCentavos)).toEqual([
        11000, 124500,
      ]);
    });

    it("muestra la calidad detectada junto a cada calidad declarada", async () => {
      const { proveedor: prov } = await loteA();
      await loteAbierto(prov, {
        costo: 10000,
        unidades: 4,
        descartes: 1,
        condiciones: ["buena", "buena", "con_detalles"],
        calidadDeclarada: "Primera",
      });
      await loteAbierto(prov, {
        costo: 5000,
        unidades: 2,
        condiciones: ["muy_buena", "excelente"],
        calidadDeclarada: "Segunda",
      });

      const rentabilidad = await dominio.rentabilidadDeProveedor(prov.id);

      expect(rentabilidad?.calidadPorDeclarada).toEqual([
        {
          calidadDeclaradaNombre: "Primera",
          lotes: 2,
          calidadDetectada: {
            condiciones: { excelente: 1, muy_buena: 1, buena: 3, con_detalles: 2 },
            sinCondicion: 0,
            // 6 + 4
            unidadesRecibidas: 10,
            // 2 + 1 irrecuperable del lote A, 1 del segundo
            descartes: 4,
            porcentajeDescarte: 40,
          },
        },
        {
          calidadDeclaradaNombre: "Segunda",
          lotes: 1,
          calidadDetectada: {
            condiciones: { excelente: 1, muy_buena: 1, buena: 0, con_detalles: 0 },
            sinCondicion: 0,
            unidadesRecibidas: 2,
            descartes: 0,
            porcentajeDescarte: 0,
          },
        },
      ]);
    });

    it("desglosa por tipo y por condición el agregado de sus piezas", async () => {
      const { proveedor: prov } = await loteA();
      await dominio.registrarCompraAParticular({
        proveedorId: prov.id,
        costoDirectoCentavos: 3000,
        condicionIngreso: "excelente",
      });

      const rentabilidad = await dominio.rentabilidadDeProveedor(prov.id);

      expect(rentabilidad?.porCondicion.find((f) => f.condicion === "excelente")).toMatchObject({
        piezas: 2,
        vendidas: 1,
        sinVender: 1,
        ingresosCentavos: 50000,
        // 31.500 del lote + 3.000 de la compra
        costoImputadoCentavos: 34500,
        margenCentavos: 15500,
      });
      // La compra a particular no tiene tipo todavía.
      expect(rentabilidad?.porTipo.map((f) => [f.nombre, f.piezas])).toEqual([
        [tipos[0].nombre, 2],
        [tipos[1].nombre, 2],
        [null, 1],
      ]);
    });

    it("lista los proveedores con algo comprado, cada uno con su agregado", async () => {
      await loteA();
      const norte = await proveedor("Fardos Norte");
      await dominio.registrarLote({
        proveedorId: norte.id,
        canal: "lote_clasificado",
        calidadDeclaradaId: await calidad("Segunda"),
        costoCentavos: 5000,
        fechaCompra: new Date("2026-09-10T00:00:00Z"),
      });
      await proveedor("Sin compras");

      const proveedores = await dominio.rentabilidadDeProveedores();

      expect(
        proveedores.map((p) => [p.nombre, p.costoImputadoCentavos, p.ingresosCentavos]),
      ).toEqual([
        ["Fardos Norte", 5000, 0],
        ["Textiles del Sur", 124500, 90000],
      ]);
    });

    it("el filtro de fecha deja solo los lotes comprados en ese rango", async () => {
      const { proveedor: prov } = await loteA();
      await loteAbierto(prov, {
        costo: 7000,
        unidades: 1,
        condiciones: ["buena"],
        fechaCompra: new Date("2026-07-15T00:00:00Z"),
      });

      const [julio] = await dominio.rentabilidadDeProveedores({
        desde: new Date("2026-07-01T00:00:00Z"),
        hasta: new Date("2026-07-31T00:00:00Z"),
      });

      expect(julio).toMatchObject({ lotes: 1, costoImputadoCentavos: 7000 });
    });

    it("devuelve null si el proveedor no existe o el id no es válido", async () => {
      expect(await dominio.rentabilidadDeProveedor(999)).toBeNull();
      expect(await dominio.rentabilidadDeProveedor(-1)).toBeNull();
      expect(await dominio.rentabilidadDeProveedor(2 ** 40)).toBeNull();
    });
  });
});
