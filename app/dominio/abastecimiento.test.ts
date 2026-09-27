import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ErrorDeDominio, type Dominio, type Proveedor } from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

describe("abastecimiento", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;

  beforeEach(async () => {
    base = await crearBaseDePrueba({});
    dominio = base.dominio;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  async function unProveedor(nombre = "Textiles del Sur"): Promise<Proveedor> {
    return dominio.registrarProveedor({ nombre, contacto: "+591 700 00000" });
  }

  async function unaCalidad(): Promise<number> {
    const { calidadesDeclaradas } = await dominio.listas();
    return calidadesDeclaradas.find((c) => c.nombre === "Primera")!.id;
  }

  async function unLote(overrides: Partial<Parameters<Dominio["registrarLote"]>[0]> = {}) {
    const proveedor = await unProveedor();
    const calidadDeclaradaId = await unaCalidad();
    return dominio.registrarLote({
      proveedorId: proveedor.id,
      canal: "fardo_cerrado",
      calidadDeclaradaId,
      costoCentavos: 10000,
      transporteCentavos: 2000,
      fechaCompra: new Date("2026-09-01T00:00:00Z"),
      ...overrides,
    });
  }

  describe("proveedores", () => {
    it("registra un proveedor con nombre y contacto", async () => {
      const proveedor = await unProveedor("María (particular)");

      expect(proveedor).toMatchObject({ nombre: "María (particular)", contacto: "+591 700 00000" });
      expect(await dominio.listarProveedores()).toEqual([proveedor]);
    });

    it("un particular también es proveedor: mismos campos, sin distinción", async () => {
      const particular = await dominio.registrarProveedor({
        nombre: "  Ana   Gómez  ",
        contacto: "69600001",
      });

      expect(particular.nombre).toBe("Ana Gómez");
    });

    it("rechaza un proveedor sin nombre o sin contacto", async () => {
      await expect(
        dominio.registrarProveedor({ nombre: "  ", contacto: "69600001" }),
      ).rejects.toMatchObject({ errores: { nombre: expect.any(String) } });
      await expect(
        dominio.registrarProveedor({ nombre: "Textiles", contacto: "" }),
      ).rejects.toMatchObject({ errores: { contacto: expect.any(String) } });
    });

    it("lista los proveedores, los últimos dados de alta primero", async () => {
      await unProveedor("Primero");
      await unProveedor("Segundo");

      const proveedores = await dominio.listarProveedores();

      expect(proveedores.map((p) => p.nombre)).toEqual(["Segundo", "Primero"]);
    });
  });

  describe("lotes", () => {
    it("registra un lote con proveedor, canal, calidad declarada, costo, transporte y fechas", async () => {
      const proveedor = await unProveedor();
      const calidadDeclaradaId = await unaCalidad();

      const lote = await dominio.registrarLote({
        proveedorId: proveedor.id,
        canal: "fardo_cerrado",
        calidadDeclaradaId,
        costoCentavos: 50000,
        transporteCentavos: 3000,
        fechaCompra: new Date("2026-09-01T00:00:00Z"),
        fechaRecepcion: new Date("2026-09-05T00:00:00Z"),
      });

      expect(lote).toMatchObject({
        proveedorId: proveedor.id,
        proveedorNombre: proveedor.nombre,
        canal: "fardo_cerrado",
        calidadDeclaradaNombre: "Primera",
        costoCentavos: 50000,
        transporteCentavos: 3000,
        abierto: false,
        piezas: 0,
      });
    });

    it("el transporte es 0 si no se indica", async () => {
      const lote = await unLote({ transporteCentavos: undefined });

      expect(lote.transporteCentavos).toBe(0);
    });

    it("rechaza un proveedor o una calidad declarada que no existen", async () => {
      await expect(
        unLote({ proveedorId: 9999 }),
      ).rejects.toMatchObject({ errores: { proveedorId: expect.any(String) } });
      await expect(
        unLote({ calidadDeclaradaId: 9999 }),
      ).rejects.toMatchObject({ errores: { calidadDeclaradaId: expect.any(String) } });
    });

    it("rechaza un costo imposible o una recepción anterior a la compra", async () => {
      await expect(unLote({ costoCentavos: 0 })).rejects.toMatchObject({
        errores: { costoCentavos: expect.any(String) },
      });
      await expect(
        unLote({
          fechaCompra: new Date("2026-09-10T00:00:00Z"),
          fechaRecepcion: new Date("2026-09-01T00:00:00Z"),
        }),
      ).rejects.toMatchObject({ errores: { fechaRecepcion: expect.any(String) } });
    });

    it("lista los lotes, los últimos registrados primero", async () => {
      const primero = await unLote();
      const segundo = await unLote();

      const lotes = await dominio.listarLotes();

      expect(lotes.map((l) => l.id)).toEqual([segundo.id, primero.id]);
    });

    it("trae un lote por su id, o null si no existe", async () => {
      const lote = await unLote();

      expect(await dominio.loteDelPanel(lote.id)).toMatchObject({ id: lote.id });
      expect(await dominio.loteDelPanel(999999)).toBeNull();
    });

    it("trae un proveedor por su id, o null si no existe", async () => {
      const proveedor = await unProveedor();

      expect(await dominio.proveedorDelPanel(proveedor.id)).toEqual(proveedor);
      expect(await dominio.proveedorDelPanel(999999)).toBeNull();
    });
  });

  describe("apertura", () => {
    it("crea una pieza por cada unidad recibida (sin contar descartes), con su condición de ingreso", async () => {
      const lote = await unLote();

      const { lote: abierto, piezas } = await dominio.abrirLote(lote.id, {
        fecha: new Date("2026-09-10T00:00:00Z"),
        unidadesRecibidas: 5,
        descartes: 1,
        notaApertura: "Resultó de segunda",
        condicionesDeIngreso: ["excelente", "muy_buena", "buena", "con_detalles"],
      });

      expect(abierto).toMatchObject({
        abierto: true,
        unidadesRecibidas: 5,
        descartes: 1,
        notaApertura: "Resultó de segunda",
        piezas: 4,
      });
      expect(piezas).toHaveLength(4);
      expect(piezas.map((p) => p.condicionIngreso)).toEqual([
        "excelente",
        "muy_buena",
        "buena",
        "con_detalles",
      ]);
      expect(piezas.every((p) => p.loteId === lote.id)).toBe(true);
      expect(piezas.every((p) => p.estado === "en_preparacion")).toBe(true);
      // Cada pieza abierta sigue incompleta hasta que se carguen sus atributos.
      expect(piezas[0].faltanParaPublicar).toContain("nombre");
    });

    it("no se puede abrir un lote que no existe", async () => {
      await expect(
        dominio.abrirLote(999999, {
          fecha: new Date(),
          unidadesRecibidas: 1,
          descartes: 0,
          condicionesDeIngreso: ["excelente"],
        }),
      ).rejects.toMatchObject({ motivo: "lote_no_encontrado" });
    });

    it("un lote no se abre dos veces", async () => {
      const lote = await unLote();
      const datos = () => ({
        fecha: new Date(),
        unidadesRecibidas: 1,
        descartes: 0,
        condicionesDeIngreso: ["excelente" as const],
      });
      await dominio.abrirLote(lote.id, datos());

      await expect(dominio.abrirLote(lote.id, datos())).rejects.toMatchObject({
        motivo: "transicion_no_permitida",
      });
    });

    it("exige una condición de ingreso por cada pieza recibida, ni más ni menos", async () => {
      const lote = await unLote();

      await expect(
        dominio.abrirLote(lote.id, {
          fecha: new Date(),
          unidadesRecibidas: 3,
          descartes: 1,
          condicionesDeIngreso: ["excelente"],
        }),
      ).rejects.toMatchObject({ errores: { condicionesDeIngreso: expect.any(String) } });
    });

    it("rechaza descartes mayores a las unidades recibidas", async () => {
      const lote = await unLote();

      await expect(
        dominio.abrirLote(lote.id, {
          fecha: new Date(),
          unidadesRecibidas: 2,
          descartes: 5,
          condicionesDeIngreso: [],
        }),
      ).rejects.toMatchObject({ errores: { descartes: expect.any(String) } });
    });

    it("las piezas creadas se pueden listar por lote, para el detalle del panel", async () => {
      const lote = await unLote();
      await dominio.abrirLote(lote.id, {
        fecha: new Date(),
        unidadesRecibidas: 2,
        descartes: 0,
        condicionesDeIngreso: ["excelente", "buena"],
      });

      const piezasDelLote = await dominio.listarPiezasDeLote(lote.id);

      expect(piezasDelLote).toHaveLength(2);
      expect(piezasDelLote.map((p) => p.estado)).toEqual(["en_preparacion", "en_preparacion"]);
    });

    it("una apertura con todo descartado no crea piezas", async () => {
      const lote = await unLote();

      const { lote: abierto, piezas } = await dominio.abrirLote(lote.id, {
        fecha: new Date(),
        unidadesRecibidas: 2,
        descartes: 2,
        condicionesDeIngreso: [],
      });

      expect(piezas).toHaveLength(0);
      expect(abierto.piezas).toBe(0);
    });
  });

  describe("compra a particular", () => {
    it("crea una pieza sin lote, con el proveedor y el costo directo", async () => {
      const particular = await unProveedor("Ana (particular)");

      const pieza = await dominio.registrarCompraAParticular({
        proveedorId: particular.id,
        costoDirectoCentavos: 8000,
        condicionIngreso: "buena",
      });

      expect(pieza).toMatchObject({
        loteId: null,
        proveedorId: particular.id,
        costoDirectoCentavos: 8000,
        condicionIngreso: "buena",
        estado: "en_preparacion",
      });
    });

    it("la procedencia es obligatoria: no se registra sin un proveedor válido", async () => {
      await expect(
        dominio.registrarCompraAParticular({ proveedorId: 999999, costoDirectoCentavos: 5000 }),
      ).rejects.toMatchObject({
        motivo: "datos_invalidos",
        errores: { proveedorId: expect.any(String) },
      });
    });

    it("exige un costo directo mayor que 0", async () => {
      const particular = await unProveedor();

      await expect(
        dominio.registrarCompraAParticular({ proveedorId: particular.id, costoDirectoCentavos: 0 }),
      ).rejects.toMatchObject({ errores: { costoDirectoCentavos: expect.any(String) } });
    });
  });

  describe("costo de pieza (ADR 0001)", () => {
    it("reparte el costo del lote (más transporte) entre sus piezas y suma el reacondicionamiento", async () => {
      const lote = await unLote({ costoCentavos: 10000, transporteCentavos: 2000 });
      const { piezas } = await dominio.abrirLote(lote.id, {
        fecha: new Date(),
        unidadesRecibidas: 4,
        descartes: 0,
        condicionesDeIngreso: ["excelente", "excelente", "excelente", "excelente"],
      });

      // (10000 + 2000) / 4 = 3000 por pieza.
      expect(piezas.every((p) => p.costoDePiezaCentavos === 3000)).toBe(true);

      const conReacondicionamiento = await dominio.editarPieza(piezas[0].codigo, {
        costoReacondicionamientoCentavos: 500,
      });
      expect(conReacondicionamiento.costoDePiezaCentavos).toBe(3500);
    });

    it("los descartes no reciben parte del costo: encarecen a las demás piezas", async () => {
      const lote = await unLote({ costoCentavos: 10000, transporteCentavos: 2000 });

      // 5 unidades, 1 descarte: se reparte entre 4, no entre 5.
      const { piezas } = await dominio.abrirLote(lote.id, {
        fecha: new Date(),
        unidadesRecibidas: 5,
        descartes: 1,
        condicionesDeIngreso: ["excelente", "excelente", "excelente", "excelente"],
      });

      expect(piezas.every((p) => p.costoDePiezaCentavos === 3000)).toBe(true);
    });

    it("en una compra a particular, el costo de pieza es el costo directo más el reacondicionamiento", async () => {
      const particular = await unProveedor();
      const pieza = await dominio.registrarCompraAParticular({
        proveedorId: particular.id,
        costoDirectoCentavos: 8000,
      });

      expect(pieza.costoDePiezaCentavos).toBe(8000);

      const conReacondicionamiento = await dominio.editarPieza(pieza.codigo, {
        costoReacondicionamientoCentavos: 1000,
      });
      expect(conReacondicionamiento.costoDePiezaCentavos).toBe(9000);
    });

    it("una pieza sin procedencia no tiene costo de pieza", async () => {
      const pieza = await dominio.crearPieza({});

      expect(pieza.costoDePiezaCentavos).toBeNull();
    });
  });

  describe("procedencia: se ve en el panel y nunca en el catálogo", () => {
    it("la ficha pública nunca expone lote, proveedor, costo ni condición de ingreso", async () => {
      const lote = await unLote({ costoCentavos: 10000, transporteCentavos: 2000 });
      const { piezas } = await dominio.abrirLote(lote.id, {
        fecha: new Date(),
        unidadesRecibidas: 1,
        descartes: 0,
        condicionesDeIngreso: ["excelente"],
      });
      const { tipos, colores, materiales } = await dominio.listas();
      await dominio.editarPieza(piezas[0].codigo, {
        nombre: "Bandolera de cuero",
        tipoId: tipos[0].id,
        colorId: colores[0].id,
        materialId: materiales[0].id,
        altoCm: 20,
        anchoCm: 20,
        profundidadCm: 8,
        precioCentavos: 15000,
      });
      const { rutaPublica } = await dominio.publicarPieza(piezas[0].codigo);

      const ficha = await dominio.fichaPublica(rutaPublica.slice("/carteras/".length));
      const texto = JSON.stringify(ficha);

      for (const interno of ["lote", "proveedor", "costo", "condicionIngreso", "Directo"]) {
        expect(texto).not.toContain(interno);
      }
    });
  });

  describe("listas ampliables", () => {
    it("trae los valores iniciales de calidad declarada", async () => {
      const { calidadesDeclaradas } = await dominio.listas();

      expect(calidadesDeclaradas.map((c) => c.nombre)).toEqual(["Primera", "Segunda", "Tercera"]);
    });

    it("la operadora puede sumar una calidad declarada nueva", async () => {
      const cuarta = await dominio.ampliarLista("calidadesDeclaradas", "Cuarta");

      expect((await dominio.listas()).calidadesDeclaradas.at(-1)).toEqual(cuarta);
    });
  });
});
