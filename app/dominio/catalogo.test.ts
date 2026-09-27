import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Dominio } from "./index";
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
    const catalogo = await dominio.listarCatalogo();

    expect(catalogo).toEqual([]);
  });

  it("muestra solo Disponibles y Reservadas, más recientes primero", async () => {
    await base.sembrarPieza({
      estado: "DISPONIBLE",
      publicadaEn: new Date("2026-09-01T10:00:00Z"),
    });
    await base.sembrarPieza({
      estado: "RESERVADA",
      publicadaEn: new Date("2026-09-20T10:00:00Z"),
    });
    await base.sembrarPieza({ estado: "EN_PREPARACION" });
    await base.sembrarPieza({
      estado: "VENDIDA",
      publicadaEn: new Date("2026-09-25T10:00:00Z"),
    });
    await base.sembrarPieza({
      estado: "RETIRADA",
      publicadaEn: new Date("2026-09-10T10:00:00Z"),
    });

    const catalogo = await dominio.listarCatalogo();

    expect(catalogo).toEqual([{ estado: "reservada" }, { estado: "disponible" }]);
  });

  it("cada prueba arranca con una base limpia", async () => {
    expect(await dominio.listarCatalogo()).toEqual([]);
  });
});
