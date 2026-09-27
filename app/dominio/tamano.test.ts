import { describe, expect, it } from "vitest";

import { anchoDeTamano, rangoDeTamano, tamanoPorAncho, type UmbralesDeTamano } from "./tamano";

const iniciales: UmbralesDeTamano = {
  pequenaDesde: 18,
  medianaDesde: 25,
  grandeDesde: 33,
};

describe("tamaño derivado del ancho", () => {
  it.each([
    [12, "Mini"],
    [17.5, "Mini"],
    [18, "Pequeña"],
    [24, "Pequeña"],
    [25, "Mediana"],
    [32, "Mediana"],
    [33, "Grande"],
    [45, "Grande"],
  ] as const)("%s cm de ancho es %s", (ancho, tamano) => {
    expect(tamanoPorAncho(ancho, iniciales)).toBe(tamano);
  });

  it("sigue los umbrales que ajuste la operadora", () => {
    const ajustados = { pequenaDesde: 20, medianaDesde: 27, grandeDesde: 35 };

    expect(tamanoPorAncho(18, ajustados)).toBe("Mini");
    expect(tamanoPorAncho(34, ajustados)).toBe("Mediana");
    expect(rangoDeTamano("Mediana", ajustados)).toBe("de 27 a 34 cm de ancho");
  });

  it("describe los rangos publicados", () => {
    expect(rangoDeTamano("Mini", iniciales)).toBe("menos de 18 cm de ancho");
    expect(rangoDeTamano("Pequeña", iniciales)).toBe("de 18 a 24 cm de ancho");
    expect(rangoDeTamano("Mediana", iniciales)).toBe("de 25 a 32 cm de ancho");
    expect(rangoDeTamano("Grande", iniciales)).toBe("más de 32 cm de ancho");
  });

  it("da el rango de ancho de cada tamaño, para filtrar por él", () => {
    expect(anchoDeTamano("Mini", iniciales)).toEqual({ desde: 0, hasta: 18 });
    expect(anchoDeTamano("Pequeña", iniciales)).toEqual({ desde: 18, hasta: 25 });
    expect(anchoDeTamano("Mediana", iniciales)).toEqual({ desde: 25, hasta: 33 });
    expect(anchoDeTamano("Grande", iniciales)).toEqual({ desde: 33, hasta: null });
  });
});
