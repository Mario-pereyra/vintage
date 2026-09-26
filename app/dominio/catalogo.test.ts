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
});
