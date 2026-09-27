import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ErrorDeDominio, TOMAS_REQUERIDAS, type Dominio } from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

const PUBLICADA_EL = new Date("2026-09-20T15:30:00Z");
const DIA = 24 * 60 * 60_000;

describe("historial de precio", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;
  /** El reloj del dominio: cada prueba lo adelanta con `pasan(dias)`. */
  let ahora: Date;

  beforeEach(async () => {
    ahora = PUBLICADA_EL;
    base = await crearBaseDePrueba({ ahora: () => ahora });
    dominio = base.dominio;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  function pasan(dias: number) {
    ahora = new Date(ahora.getTime() + dias * DIA);
  }

  /** Una pieza publicada (Disponible), con precio inicial de Bs 180. */
  async function piezaPublicada(precioCentavos = 18000) {
    const { tipos, colores, materiales } = await dominio.listas();
    const { codigo } = await dominio.crearPieza({
      nombre: "Bandolera de cuero negra",
      tipoId: tipos[0].id,
      colorId: colores[0].id,
      materialId: materiales[0].id,
      altoCm: 22,
      anchoCm: 30,
      profundidadCm: 9,
      precioCentavos,
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

  it("una pieza recién publicada todavía no tiene historial", async () => {
    const codigo = await piezaPublicada();

    expect(await dominio.historialDePrecio(codigo)).toEqual([]);
  });

  it("el primer cambio siembra también el precio con el que se publicó", async () => {
    const codigo = await piezaPublicada(18000);
    pasan(3);

    await dominio.cambiarPrecioPublicado(codigo, 15000);

    expect(await dominio.historialDePrecio(codigo)).toEqual([
      { precioCentavos: 15000, fecha: ahora },
      { precioCentavos: 18000, fecha: PUBLICADA_EL },
    ]);
    expect((await dominio.piezaDelPanel(codigo))?.precioCentavos).toBe(15000);
  });

  it("una rebaja posterior no vuelve a sembrar el precio de publicación", async () => {
    const codigo = await piezaPublicada(18000);
    pasan(3);
    await dominio.cambiarPrecioPublicado(codigo, 15000);
    const primerCambio = ahora;
    pasan(4);

    await dominio.cambiarPrecioPublicado(codigo, 12000);

    expect(await dominio.historialDePrecio(codigo)).toEqual([
      { precioCentavos: 12000, fecha: ahora },
      { precioCentavos: 15000, fecha: primerCambio },
      { precioCentavos: 18000, fecha: PUBLICADA_EL },
    ]);
  });

  it("cambiar al mismo precio no agrega una fila repetida", async () => {
    const codigo = await piezaPublicada(18000);
    pasan(1);
    await dominio.cambiarPrecioPublicado(codigo, 15000);

    await dominio.cambiarPrecioPublicado(codigo, 15000);

    expect(await dominio.historialDePrecio(codigo)).toHaveLength(2);
  });

  it("no cambia el precio de una pieza que no está publicada", async () => {
    const { codigo } = await dominio.crearPieza({});

    await expect(dominio.cambiarPrecioPublicado(codigo, 15000)).rejects.toMatchObject({
      motivo: "transicion_no_permitida",
    });
  });

  it("no cambia el precio de una pieza que no existe", async () => {
    await expect(dominio.cambiarPrecioPublicado("VT-9999", 15000)).rejects.toMatchObject({
      motivo: "pieza_no_encontrada",
    });
  });

  it("rechaza un precio inválido o fuera de rango", async () => {
    const codigo = await piezaPublicada();

    await expect(dominio.cambiarPrecioPublicado(codigo, 0)).rejects.toBeInstanceOf(ErrorDeDominio);
    await expect(dominio.cambiarPrecioPublicado(codigo, -100)).rejects.toMatchObject({
      errores: { precioCentavos: expect.any(String) },
    });
    await expect(dominio.cambiarPrecioPublicado(codigo, 150.5)).rejects.toMatchObject({
      errores: { precioCentavos: expect.any(String) },
    });
    await expect(dominio.cambiarPrecioPublicado(codigo, 10_000_001)).rejects.toMatchObject({
      errores: { precioCentavos: expect.any(String) },
    });
  });

  it("el historial de una pieza no mezcla el de otra", async () => {
    const primera = await piezaPublicada(18000);
    const segunda = await piezaPublicada(9000);
    pasan(1);

    await dominio.cambiarPrecioPublicado(primera, 16000);

    expect(await dominio.historialDePrecio(segunda)).toEqual([]);
  });
});
