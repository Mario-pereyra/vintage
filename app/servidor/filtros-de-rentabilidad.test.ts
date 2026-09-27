import { describe, expect, it } from "vitest";

import { leerFiltrosDeRentabilidad, leerId } from "./filtros-de-rentabilidad.server";

const url = (consulta: string) => new URL(`https://vintage.test/admin/rentabilidad?${consulta}`);

describe("filtros de rentabilidad", () => {
  it("lee los dos días a medianoche", () => {
    const { filtros } = leerFiltrosDeRentabilidad(url("desde=2026-09-01&hasta=2026-09-30"));

    expect(filtros.desde).toEqual(new Date("2026-09-01T00:00:00"));
    expect(filtros.hasta).toEqual(new Date("2026-09-30T00:00:00"));
  });

  it("sin filtro, sin fechas", () => {
    expect(leerFiltrosDeRentabilidad(url("")).filtros).toEqual({ desde: null, hasta: null });
  });

  it("un día que no existe, otro formato o un texto largo son fechas inválidas", () => {
    for (const valor of ["2026-02-31", "01/09/2026", "2026-09-01T00:00", "x".repeat(5000)]) {
      const { filtros } = leerFiltrosDeRentabilidad(url(`desde=${encodeURIComponent(valor)}`));
      expect(Number.isNaN(filtros.desde!.getTime())).toBe(true);
    }
  });

  it("un id solo es un entero corto de dígitos", () => {
    expect(leerId("42")).toBe(42);
    for (const valor of [undefined, "", "-1", "1.5", "1e3", "12345678901", "0x10"]) {
      expect(leerId(valor)).toBeNaN();
    }
  });
});
