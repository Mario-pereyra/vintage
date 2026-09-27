import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Dominio } from "./index";
import { PRECIO_MAXIMO_CENTAVOS } from "./piezas";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

describe("catálogo público", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;

  beforeEach(async () => {
    base = await crearBaseDePrueba();
    dominio = base.dominio;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  it("está vacío cuando todavía no hay piezas publicadas", async () => {
    expect(await dominio.listarCatalogo()).toEqual({ piezas: [], hayMas: false });
  });

  it("muestra solo Disponibles y Reservadas, más recientes primero", async () => {
    await base.sembrarPieza({
      estado: "DISPONIBLE",
      nombre: "Disponible vieja",
      publicadaEn: new Date("2026-09-01T10:00:00Z"),
    });
    await base.sembrarPieza({
      estado: "RESERVADA",
      nombre: "Reservada nueva",
      publicadaEn: new Date("2026-09-20T10:00:00Z"),
    });
    await base.sembrarPieza({ estado: "EN_PREPARACION", nombre: "En preparación" });
    await base.sembrarPieza({
      estado: "VENDIDA",
      nombre: "Vendida",
      publicadaEn: new Date("2026-09-25T10:00:00Z"),
    });
    await base.sembrarPieza({
      estado: "RETIRADA",
      nombre: "Retirada",
      publicadaEn: new Date("2026-09-10T10:00:00Z"),
    });

    const { piezas } = await dominio.listarCatalogo();

    expect(piezas.map((p) => [p.nombre, p.estado])).toEqual([
      ["Reservada nueva", "reservada"],
      ["Disponible vieja", "disponible"],
    ]);
  });

  it("cada pieza trae Ref., ruta, precio y tamaño, y nunca el ID interno", async () => {
    const { tipos, colores, materiales } = await dominio.listas();
    await base.sembrarPieza({
      estado: "DISPONIBLE",
      publicadaEn: new Date("2026-09-20T10:00:00Z"),
      nombre: "Bandolera de cuero negra",
      tipoId: tipos.find((t) => t.nombre === "Bandolera")!.id,
      colorId: colores.find((c) => c.nombre === "Negro")!.id,
      materialId: materiales.find((m) => m.nombre === "Cuero")!.id,
      anchoCm: 30,
      precioCentavos: 18000,
    });

    const { piezas } = await dominio.listarCatalogo();

    expect(piezas).toEqual([
      {
        codigo: "VT-0001",
        nombre: "Bandolera de cuero negra",
        ruta: expect.stringMatching(/^\/carteras\/bandolera-cuero-negra-[0-9a-hjkmnp-tv-z]{6}$/),
        estado: "disponible",
        precioCentavos: 18000,
        tamano: "Mediana",
        foto: null,
      },
    ]);
    expect(JSON.stringify(piezas)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
  });

  describe("filtros", () => {
    it("filtra por tipo", async () => {
      const { tipos } = await dominio.listas();
      const bandolera = tipos.find((t) => t.nombre === "Bandolera")!.id;
      const tote = tipos.find((t) => t.nombre === "Tote")!.id;
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Una bandolera", tipoId: bandolera });
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Un tote", tipoId: tote });

      const { piezas } = await dominio.listarCatalogo({ tipoId: bandolera });

      expect(piezas.map((p) => p.nombre)).toEqual(["Una bandolera"]);
    });

    it("filtra por color", async () => {
      const { colores } = await dominio.listas();
      const negro = colores.find((c) => c.nombre === "Negro")!.id;
      const rojo = colores.find((c) => c.nombre === "Rojo")!.id;
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Negra", colorId: negro });
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Roja", colorId: rojo });

      const { piezas } = await dominio.listarCatalogo({ colorId: rojo });

      expect(piezas.map((p) => p.nombre)).toEqual(["Roja"]);
    });

    it("filtra por tamaño, según los umbrales vigentes", async () => {
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Mini", anchoCm: 12 });
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Pequeña", anchoCm: 20 });
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Grande", anchoCm: 40 });

      const { piezas } = await dominio.listarCatalogo({ tamano: "Pequeña" });

      expect(piezas.map((p) => p.nombre)).toEqual(["Pequeña"]);
    });

    it("filtra por rango de precio", async () => {
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Barata", precioCentavos: 3000 });
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Media", precioCentavos: 15000 });
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Cara", precioCentavos: 50000 });

      const { piezas } = await dominio.listarCatalogo({
        precioMinCentavos: 10000,
        precioMaxCentavos: 20000,
      });

      expect(piezas.map((p) => p.nombre)).toEqual(["Media"]);
    });

    it("combina varios filtros a la vez", async () => {
      const { tipos, colores } = await dominio.listas();
      const bandolera = tipos.find((t) => t.nombre === "Bandolera")!.id;
      const negro = colores.find((c) => c.nombre === "Negro")!.id;
      const rojo = colores.find((c) => c.nombre === "Rojo")!.id;
      await base.sembrarPieza({
        estado: "DISPONIBLE",
        nombre: "Bandolera negra",
        tipoId: bandolera,
        colorId: negro,
      });
      await base.sembrarPieza({
        estado: "DISPONIBLE",
        nombre: "Bandolera roja",
        tipoId: bandolera,
        colorId: rojo,
      });

      const { piezas } = await dominio.listarCatalogo({ tipoId: bandolera, colorId: negro });

      expect(piezas.map((p) => p.nombre)).toEqual(["Bandolera negra"]);
    });

    it("sin coincidencias, el listado queda vacío", async () => {
      await base.sembrarPieza({ estado: "DISPONIBLE", precioCentavos: 3000 });

      expect(await dominio.listarCatalogo({ precioMinCentavos: 1_000_000 })).toEqual({
        piezas: [],
        hayMas: false,
      });
    });
  });

  // Los filtros vienen de parámetros de la URL: cualquier valor "sintácticamente
  // válido" puede llegar hasta acá (un typo con más ceros, un enlace armado a
  // mano). `tipoId`, `colorId` y `precioCentavos` son columnas INTEGER (32
  // bits) en Postgres: un valor fuera de su rango no se ignora en el `where`,
  // hace que la consulta entera falle. El dominio nunca deja pasar eso.
  describe("filtros fuera de rango", () => {
    it("ignora un tipoId o un colorId que no entra en una columna INTEGER", async () => {
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Pieza" });

      const porTipo = await dominio.listarCatalogo({ tipoId: 99_999_999_999 });
      const porColor = await dominio.listarCatalogo({ colorId: -5 });

      expect(porTipo.piezas.map((p) => p.nombre)).toEqual(["Pieza"]);
      expect(porColor.piezas.map((p) => p.nombre)).toEqual(["Pieza"]);
    });

    it("ignora un precio mínimo o máximo que no sea un entero positivo", async () => {
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Pieza", precioCentavos: 5000 });

      const { piezas } = await dominio.listarCatalogo({ precioMinCentavos: -10 });

      expect(piezas.map((p) => p.nombre)).toEqual(["Pieza"]);
    });

    it("acota un precio fuera de rango al mismo tope que una pieza (PRECIO_MAXIMO_CENTAVOS)", async () => {
      await base.sembrarPieza({
        estado: "DISPONIBLE",
        nombre: "La más cara posible",
        precioCentavos: PRECIO_MAXIMO_CENTAVOS,
      });

      const { piezas } = await dominio.listarCatalogo({ precioMaxCentavos: 99_999_999_999 });

      expect(piezas.map((p) => p.nombre)).toEqual(["La más cara posible"]);
    });

    it("intercambia el rango de precio si el mínimo llega mayor que el máximo", async () => {
      await base.sembrarPieza({ estado: "DISPONIBLE", nombre: "Media", precioCentavos: 15000 });

      const { piezas } = await dominio.listarCatalogo({
        precioMinCentavos: 20000,
        precioMaxCentavos: 10000,
      });

      expect(piezas.map((p) => p.nombre)).toEqual(["Media"]);
    });
  });

  it("una pieza publicada con datos obligatorios nulos se omite, sin romper el listado", async () => {
    await base.sembrarPieza({
      estado: "DISPONIBLE",
      nombre: "Completa",
      publicadaEn: new Date("2026-09-20T10:00:00Z"),
    });
    await base.sembrarPieza({
      estado: "DISPONIBLE",
      nombre: null,
      publicadaEn: new Date("2026-09-21T10:00:00Z"),
    });

    const { piezas } = await dominio.listarCatalogo();

    expect(piezas.map((p) => p.nombre)).toEqual(["Completa"]);
  });

  describe("paginación", () => {
    it("limita cuántas piezas trae y avisa si hay más", async () => {
      for (let i = 1; i <= 3; i++) {
        await base.sembrarPieza({
          estado: "DISPONIBLE",
          nombre: `Pieza ${i}`,
          publicadaEn: new Date(2026, 8, i),
        });
      }

      const primeras = await dominio.listarCatalogo({}, 2);
      expect(primeras.piezas.map((p) => p.nombre)).toEqual(["Pieza 3", "Pieza 2"]);
      expect(primeras.hayMas).toBe(true);

      const todas = await dominio.listarCatalogo({}, 3);
      expect(todas.piezas).toHaveLength(3);
      expect(todas.hayMas).toBe(false);
    });
  });
});
