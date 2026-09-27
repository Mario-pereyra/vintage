import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ErrorDeDominio, TOMAS_REQUERIDAS, type DatosDePieza, type Dominio } from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

describe("fotos de pieza", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;

  beforeEach(async () => {
    base = await crearBaseDePrueba();
    dominio = base.dominio;
  });

  afterEach(async () => {
    await base.cerrar();
  });

  /** Datos completos de una bandolera, con valores de las listas iniciales. */
  async function bandolera(): Promise<DatosDePieza> {
    const { tipos, colores, materiales } = await dominio.listas();
    return {
      nombre: "Bandolera de cuero negra",
      tipoId: tipos.find((t) => t.nombre === "Bandolera")!.id,
      colorId: colores.find((c) => c.nombre === "Negro")!.id,
      materialId: materiales.find((m) => m.nombre === "Cuero")!.id,
      altoCm: 22,
      anchoCm: 30,
      profundidadCm: 9,
      precioCentavos: 18000,
    };
  }

  function clavesDe(tipo: string) {
    return {
      claveMiniatura: `${tipo}-mini.jpg`,
      claveCatalogo: `${tipo}-cat.jpg`,
      claveDetalle: `${tipo}-det.jpg`,
    };
  }

  /** Agrega las 8 tomas requeridas, en el orden de `TOMAS_REQUERIDAS`. */
  async function agregarTomas(codigo: string) {
    for (const tipo of TOMAS_REQUERIDAS) {
      await dominio.agregarFoto(codigo, tipo, clavesDe(tipo));
    }
  }

  describe("agregar", () => {
    it("una foto nueva se suma y la primera queda como portada", async () => {
      const { codigo } = await dominio.crearPieza({});

      const fotos = await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      expect(fotos).toEqual([
        { tipo: "dorso", etiqueta: "Dorso", portada: true, ...clavesDe("dorso") },
      ]);
    });

    it("una segunda toma no toca la portada de la primera", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));

      const fotos = await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      expect(fotos.find((f) => f.tipo === "frente")?.portada).toBe(true);
      expect(fotos.find((f) => f.tipo === "dorso")?.portada).toBe(false);
    });

    it("las fotos se listan siempre en el orden fijo de las tomas, no el de carga", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "puesta", clavesDe("puesta"));
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "asas", clavesDe("asas"));

      const fotos = await dominio.fotosDePieza(codigo);

      expect(fotos.map((f) => f.tipo)).toEqual(["frente", "asas", "puesta"]);
    });

    it("volver a fotografiar una toma reemplaza sus claves sin duplicarla", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente-v1"));

      const fotos = await dominio.agregarFoto(codigo, "frente", clavesDe("frente-v2"));

      expect(fotos).toHaveLength(1);
      expect(fotos[0]).toMatchObject(clavesDe("frente-v2"));
    });

    it("rechaza una toma que no es una de las 8", async () => {
      const { codigo } = await dominio.crearPieza({});

      await expect(
        // @ts-expect-error -- justo lo que la prueba quiere forzar
        dominio.agregarFoto(codigo, "colgante", clavesDe("colgante")),
      ).rejects.toMatchObject({ motivo: "datos_invalidos" });
    });

    it("no admite una pieza que no existe", async () => {
      await expect(
        dominio.agregarFoto("VT-0042", "frente", clavesDe("frente")),
      ).rejects.toMatchObject({ motivo: "pieza_no_encontrada" });
    });
  });

  describe("tomas que faltan", () => {
    it("una pieza sin fotos indica las 8 tomas", async () => {
      const { codigo } = await dominio.crearPieza({});

      const pieza = await dominio.piezaDelPanel(codigo);

      expect(pieza?.tomasFaltantes).toEqual(TOMAS_REQUERIDAS);
    });

    it("se van descontando a medida que se cargan", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      const pieza = await dominio.piezaDelPanel(codigo);

      expect(pieza?.tomasFaltantes).not.toContain("frente");
      expect(pieza?.tomasFaltantes).not.toContain("dorso");
      expect(pieza?.tomasFaltantes).toHaveLength(6);
    });
  });

  describe("publicar exige las 8 tomas", () => {
    it("no publica con menos de 8 tomas y dice cuáles faltan", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));

      await expect(dominio.publicarPieza(codigo)).rejects.toMatchObject({
        motivo: "pieza_incompleta",
        errores: { fotos: expect.stringContaining("dorso") },
      });
    });

    it("publica con las 8 tomas cargadas", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await agregarTomas(codigo);

      const publicada = await dominio.publicarPieza(codigo);

      expect(publicada.estado).toBe("disponible");
      expect(publicada.tomasFaltantes).toEqual([]);
    });
  });

  describe("eliminar", () => {
    it("saca la foto de la lista", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      const fotos = await dominio.eliminarFoto(codigo, "frente");

      expect(fotos.map((f) => f.tipo)).toEqual(["dorso"]);
    });

    it("si borra la portada, la portada pasa a la primera toma que queda", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      const fotos = await dominio.eliminarFoto(codigo, "frente");

      expect(fotos).toEqual([
        { tipo: "dorso", etiqueta: "Dorso", portada: true, ...clavesDe("dorso") },
      ]);
    });

    it("no se puede borrar una toma de una pieza ya publicada", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await agregarTomas(codigo);
      await dominio.publicarPieza(codigo);

      await expect(dominio.eliminarFoto(codigo, "frente")).rejects.toMatchObject({
        motivo: "datos_invalidos",
        errores: { fotos: expect.any(String) },
      });
      expect(await dominio.fotosDePieza(codigo)).toHaveLength(8);
    });

    it("rechaza una toma que no es una de las 8 y no borra ninguna otra foto", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      await expect(
        // @ts-expect-error -- justo lo que la prueba quiere forzar
        dominio.eliminarFoto(codigo, "colgante"),
      ).rejects.toMatchObject({ motivo: "datos_invalidos" });
      // Regresión: con `tipo` inválido, `deleteMany` no debe interpretarlo
      // como "sin filtro" y borrar todas las fotos de la pieza.
      expect(await dominio.fotosDePieza(codigo)).toHaveLength(2);
    });
  });

  describe("elegir portada", () => {
    it("cambia cuál es la portada", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "puesta", clavesDe("puesta"));

      const fotos = await dominio.elegirPortada(codigo, "puesta");

      expect(fotos.find((f) => f.tipo === "frente")?.portada).toBe(false);
      expect(fotos.find((f) => f.tipo === "puesta")?.portada).toBe(true);
    });

    it("rechaza una toma que todavía no tiene foto", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));

      await expect(dominio.elegirPortada(codigo, "dorso")).rejects.toMatchObject({
        motivo: "datos_invalidos",
      });
    });

    it("rechaza una toma que no es una de las 8", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));

      await expect(
        // @ts-expect-error -- justo lo que la prueba quiere forzar
        dominio.elegirPortada(codigo, "colgante"),
      ).rejects.toMatchObject({ motivo: "datos_invalidos" });
    });
  });

  describe("intercambiar dos tomas", () => {
    it("cambia las fotos de lugar sin tocar el tipo de toma", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      const fotos = await dominio.intercambiarFotos(codigo, "frente", "dorso");

      expect(fotos.find((f) => f.tipo === "frente")).toMatchObject(clavesDe("dorso"));
      expect(fotos.find((f) => f.tipo === "dorso")).toMatchObject(clavesDe("frente"));
    });

    it("la portada sigue a la foto, no a la toma", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      const fotos = await dominio.intercambiarFotos(codigo, "frente", "dorso");

      expect(fotos.find((f) => f.tipo === "dorso")?.portada).toBe(true);
      expect(fotos.find((f) => f.tipo === "frente")?.portada).toBe(false);
    });

    it("rechaza intercambiar con una toma sin foto", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));

      await expect(
        dominio.intercambiarFotos(codigo, "frente", "dorso"),
      ).rejects.toMatchObject({ motivo: "datos_invalidos" });
    });

    it("rechaza una toma que no es una de las 8, sea el primer o el segundo lado", async () => {
      const { codigo } = await dominio.crearPieza({});
      await dominio.agregarFoto(codigo, "frente", clavesDe("frente"));
      await dominio.agregarFoto(codigo, "dorso", clavesDe("dorso"));

      await expect(
        // @ts-expect-error -- justo lo que la prueba quiere forzar
        dominio.intercambiarFotos(codigo, "colgante", "dorso"),
      ).rejects.toMatchObject({ motivo: "datos_invalidos" });
      await expect(
        // @ts-expect-error -- justo lo que la prueba quiere forzar
        dominio.intercambiarFotos(codigo, "frente", "colgante"),
      ).rejects.toMatchObject({ motivo: "datos_invalidos" });
      // Ninguno de los dos intentos tocó las fotos existentes.
      expect(await dominio.fotosDePieza(codigo)).toHaveLength(2);
    });
  });

  describe("ficha pública", () => {
    it("expone las 8 fotos en el orden fijo, con su portada", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await agregarTomas(codigo);
      const { rutaPublica } = await dominio.publicarPieza(codigo);

      const ficha = await dominio.fichaPublica(rutaPublica.replace("/carteras/", ""));

      expect(ficha?.fotos).toHaveLength(8);
      expect(ficha?.fotos.map((f) => f.tipo)).toEqual(TOMAS_REQUERIDAS);
      expect(ficha?.fotos.find((f) => f.portada)).toMatchObject({
        tipo: "frente",
        claveCatalogo: "frente-cat.jpg",
      });
      // Nunca expone la miniatura ni el id interno de la foto.
      expect(JSON.stringify(ficha?.fotos)).not.toContain("mini.jpg");
    });
  });
});
