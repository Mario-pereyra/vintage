import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CODIGOS_MAXIMOS_POR_ASIGNACION,
  ErrorDeDominio,
  TOMAS_REQUERIDAS,
  type Dominio,
} from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

describe("drops", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;

  beforeEach(async () => {
    base = await crearBaseDePrueba({});
    dominio = base.dominio;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  /** Una pieza En preparación, completa o no según `completa`. */
  async function piezaEnPreparacion(nombre: string, completa: boolean) {
    const { tipos, colores, materiales } = await dominio.listas();
    const { codigo } = await dominio.crearPieza(
      completa
        ? {
            nombre,
            tipoId: tipos[0].id,
            colorId: colores[0].id,
            materialId: materiales[0].id,
            altoCm: 22,
            anchoCm: 30,
            profundidadCm: 9,
            precioCentavos: 18000,
          }
        : { nombre },
    );
    if (completa) {
      for (const tipo of TOMAS_REQUERIDAS) {
        await dominio.agregarFoto(codigo, tipo, {
          claveMiniatura: `${tipo}-mini.jpg`,
          claveCatalogo: `${tipo}-cat.jpg`,
          claveDetalle: `${tipo}-det.jpg`,
        });
      }
    }
    return codigo;
  }

  it("crea un drop numerado, vacío", async () => {
    const drop = await dominio.crearDrop();

    expect(drop).toMatchObject({
      numero: `DROP #${String(drop.id).padStart(2, "0")}`,
      piezasTotal: 0,
      piezasListas: 0,
      piezasPublicadas: 0,
    });
  });

  it("asigna piezas En preparación al drop", async () => {
    const drop = await dominio.crearDrop();
    const lista = await piezaEnPreparacion("Lista para publicar", true);
    const incompleta = await piezaEnPreparacion("Le faltan datos", false);

    const actualizado = await dominio.asignarPiezasADrop(drop.id, [lista, incompleta]);

    expect(actualizado.piezasTotal).toBe(2);
    expect(actualizado.piezasListas).toBe(1);
    const piezas = await dominio.piezasDeDrop(drop.id);
    expect(piezas.map((p) => [p.codigo, p.lista])).toEqual(
      expect.arrayContaining([
        [lista, true],
        [incompleta, false],
      ]),
    );
  });

  it("no asigna una pieza que ya está publicada", async () => {
    const drop = await dominio.crearDrop();
    const codigo = await piezaEnPreparacion("Ya publicada", true);
    await dominio.publicarPieza(codigo);

    await expect(dominio.asignarPiezasADrop(drop.id, [codigo])).rejects.toMatchObject({
      motivo: "datos_invalidos",
    });
  });

  it("no asigna a un drop que no existe", async () => {
    const codigo = await piezaEnPreparacion("Suelta", true);

    await expect(dominio.asignarPiezasADrop(9999, [codigo])).rejects.toMatchObject({
      motivo: "drop_no_encontrado",
    });
  });

  it("exige elegir al menos una pieza", async () => {
    const drop = await dominio.crearDrop();

    await expect(dominio.asignarPiezasADrop(drop.id, [])).rejects.toBeInstanceOf(ErrorDeDominio);
  });

  it("no asigna más del tope de piezas por vez", async () => {
    const drop = await dominio.crearDrop();
    const demasiados = Array.from(
      { length: CODIGOS_MAXIMOS_POR_ASIGNACION + 1 },
      (_, indice) => `VT-${String(indice + 1).padStart(4, "0")}`,
    );

    await expect(dominio.asignarPiezasADrop(drop.id, demasiados)).rejects.toMatchObject({
      motivo: "datos_invalidos",
    });
  });

  describe("publicación del drop", () => {
    it("publica todas las piezas listas del drop, sin tocar las incompletas", async () => {
      const drop = await dominio.crearDrop();
      const listaUno = await piezaEnPreparacion("Lista 1", true);
      const listaDos = await piezaEnPreparacion("Lista 2", true);
      const incompleta = await piezaEnPreparacion("Incompleta", false);
      await dominio.asignarPiezasADrop(drop.id, [listaUno, listaDos, incompleta]);

      const publicadas = await dominio.publicarDrop(drop.id);

      expect(publicadas.map((p) => p.codigo).sort()).toEqual([listaDos, listaUno].sort());
      expect((await dominio.piezaDelPanel(listaUno))?.estado).toBe("disponible");
      expect((await dominio.piezaDelPanel(incompleta))?.estado).toBe("en_preparacion");
      const actualizado = await dominio.dropDelPanel(drop.id);
      expect(actualizado).toMatchObject({ piezasPublicadas: 2, piezasListas: 0 });
    });

    it("publica solo las piezas elegidas, de a poco", async () => {
      const drop = await dominio.crearDrop();
      const primera = await piezaEnPreparacion("Primera", true);
      const segunda = await piezaEnPreparacion("Segunda", true);
      await dominio.asignarPiezasADrop(drop.id, [primera, segunda]);

      const publicadas = await dominio.publicarDrop(drop.id, [primera]);

      expect(publicadas.map((p) => p.codigo)).toEqual([primera]);
      expect((await dominio.piezaDelPanel(primera))?.estado).toBe("disponible");
      expect((await dominio.piezaDelPanel(segunda))?.estado).toBe("en_preparacion");
    });

    it("rechaza publicar una pieza elegida que no está lista", async () => {
      const drop = await dominio.crearDrop();
      const incompleta = await piezaEnPreparacion("Incompleta", false);
      await dominio.asignarPiezasADrop(drop.id, [incompleta]);

      await expect(dominio.publicarDrop(drop.id, [incompleta])).rejects.toMatchObject({
        motivo: "pieza_incompleta",
      });
      expect((await dominio.piezaDelPanel(incompleta))?.estado).toBe("en_preparacion");
    });

    it("rechaza si ninguna pieza del drop está lista", async () => {
      const drop = await dominio.crearDrop();
      await piezaEnPreparacion("Incompleta", false);

      await expect(dominio.publicarDrop(drop.id)).rejects.toMatchObject({
        motivo: "pieza_incompleta",
      });
    });

    it("no publica un drop que no existe", async () => {
      await expect(dominio.publicarDrop(9999)).rejects.toMatchObject({
        motivo: "drop_no_encontrado",
      });
    });

    it("una lista de elegidas vacía no publica todo el drop: la rechaza", async () => {
      const drop = await dominio.crearDrop();
      const lista = await piezaEnPreparacion("Lista", true);
      await dominio.asignarPiezasADrop(drop.id, [lista]);

      await expect(dominio.publicarDrop(drop.id, [])).rejects.toMatchObject({
        motivo: "datos_invalidos",
      });
      expect((await dominio.piezaDelPanel(lista))?.estado).toBe("en_preparacion");
    });

    it("deduplica los códigos elegidos: no falla al elegir la misma pieza dos veces", async () => {
      const drop = await dominio.crearDrop();
      const primera = await piezaEnPreparacion("Primera", true);
      await dominio.asignarPiezasADrop(drop.id, [primera]);

      const publicadas = await dominio.publicarDrop(drop.id, [primera, primera]);

      expect(publicadas.map((p) => p.codigo)).toEqual([primera]);
    });
  });

  it("lista los drops, los últimos creados primero", async () => {
    const primero = await dominio.crearDrop();
    const segundo = await dominio.crearDrop();

    const drops = await dominio.listarDrops();

    expect(drops.map((d) => d.id)).toEqual([segundo.id, primero.id]);
  });

  it("una pieza también se publica suelta, fuera de un drop", async () => {
    const codigo = await piezaEnPreparacion("Suelta", true);

    const publicada = await dominio.publicarPieza(codigo);

    expect(publicada.estado).toBe("disponible");
  });
});
