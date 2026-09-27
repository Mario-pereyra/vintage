import { describe, expect, it } from "vitest";

import { UNIDADES_MAXIMAS } from "~/dominio";

import { leerFormularioDeApertura } from "./formulario-de-abastecimiento.server";

/**
 * `leerFormularioDeApertura` es una lectura pura de `FormData`: no necesita
 * el dominio ni una base de datos, así que se prueba directamente (además de
 * las pruebas del dominio, que son el seam principal del proyecto).
 */
describe("leerFormularioDeApertura", () => {
  function formularioDeApertura(datos: Record<string, string>): FormData {
    const formulario = new FormData();
    for (const [clave, valor] of Object.entries(datos)) formulario.set(clave, valor);
    return formulario;
  }

  it("acota las condiciones de ingreso a esperar aunque el formulario mande un número absurdo", () => {
    // Muy por encima de UNIDADES_MAXIMAS: si la lectura no acotara antes de
    // iterar, armaría un array de 50.000 posiciones (o mucho peor, con un
    // valor todavía más grande) solo para leer el formulario.
    const datos = leerFormularioDeApertura(
      formularioDeApertura({
        fecha: "2026-09-10",
        unidadesRecibidas: "50000",
        descartes: "0",
      }),
    );

    expect(datos.condicionesDeIngreso.length).toBeLessThanOrEqual(UNIDADES_MAXIMAS);
    expect(datos.condicionesDeIngreso.length).not.toBe(50000);
  });

  it("no toca el número que ve el dominio: sigue rechazando un valor fuera de rango con su propio mensaje", () => {
    const datos = leerFormularioDeApertura(
      formularioDeApertura({
        fecha: "2026-09-10",
        unidadesRecibidas: "50000",
        descartes: "0",
      }),
    );

    // El dominio (abastecimiento.ts) es quien valida y rechaza el número
    // real; la lectura del formulario no lo trunca ni lo oculta.
    expect(datos.unidadesRecibidas).toBe(50000);
  });

  it("con datos normales, junta una condición esperada por cada campo `condicion-N`", () => {
    const datos = leerFormularioDeApertura(
      formularioDeApertura({
        fecha: "2026-09-10",
        unidadesRecibidas: "2",
        descartes: "0",
        "condicion-0": "excelente",
        "condicion-1": "buena",
      }),
    );

    expect(datos.condicionesDeIngreso).toEqual(["excelente", "buena"]);
  });
});
