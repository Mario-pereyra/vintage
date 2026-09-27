import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ErrorDeDominio, type DatosDePieza, type Dominio } from "./index";
import { crearBaseDePrueba, type BaseDePrueba } from "./pruebas/base-de-prueba";

const PUBLICADA_EL = new Date("2026-09-20T15:30:00Z");

describe("pieza", () => {
  let base: BaseDePrueba;
  let dominio: Dominio;

  beforeEach(async () => {
    base = await crearBaseDePrueba({ ahora: () => PUBLICADA_EL });
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
      caidaCm: 55,
      precioCentavos: 18000,
    };
  }

  describe("carga", () => {
    it("una pieza nueva queda En preparación, con código y sin datos obligatorios", async () => {
      const pieza = await dominio.crearPieza({});

      expect(pieza.codigo).toBe("VT-0001");
      expect(pieza.estado).toBe("en_preparacion");
      expect(pieza.publicadaEn).toBeNull();
      expect(pieza.faltanParaPublicar).toEqual([
        "nombre",
        "tipoId",
        "colorId",
        "materialId",
        "altoCm",
        "anchoCm",
        "profundidadCm",
        "precioCentavos",
      ]);
    });

    it("guarda los datos cargados y los devuelve en el panel", async () => {
      const datos = await bandolera();

      const { codigo } = await dominio.crearPieza(datos);
      const pieza = await dominio.piezaDelPanel(codigo);

      expect(pieza).toMatchObject({ ...datos, codigo, tamano: "Mediana" });
      expect(pieza?.faltanParaPublicar).toEqual([]);
    });

    it("editar cambia solo los campos indicados", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());

      await dominio.editarPieza(codigo, { precioCentavos: 15000, caidaCm: null });

      expect(await dominio.piezaDelPanel(codigo)).toMatchObject({
        nombre: "Bandolera de cuero negra",
        precioCentavos: 15000,
        caidaCm: null,
      });
    });

    it("acepta el código con otro prefijo o solo el número", async () => {
      const { codigo } = await dominio.crearPieza({ nombre: "Tote de lona" });

      expect((await dominio.piezaDelPanel("1"))?.codigo).toBe(codigo);
      expect((await dominio.piezaDelPanel("vt-0001"))?.codigo).toBe(codigo);
      expect(await dominio.piezaDelPanel("VT-0002")).toBeNull();
      expect(await dominio.piezaDelPanel("sin número")).toBeNull();
    });

    it("rechaza medidas y precios imposibles, campo por campo", async () => {
      const intento = dominio.crearPieza({
        altoCm: -3,
        anchoCm: 0,
        profundidadCm: Number.NaN,
        precioCentavos: 150.5,
        tipoId: 9999,
      });

      await expect(intento).rejects.toBeInstanceOf(ErrorDeDominio);
      await expect(intento).rejects.toMatchObject({
        errores: {
          altoCm: expect.any(String),
          anchoCm: expect.any(String),
          profundidadCm: expect.any(String),
          precioCentavos: expect.any(String),
          tipoId: expect.any(String),
        },
      });
    });

    it("no se puede editar una pieza que no existe", async () => {
      await expect(dominio.editarPieza("VT-0042", { nombre: "x" })).rejects.toMatchObject({
        motivo: "pieza_no_encontrada",
      });
    });

    it("lista las piezas del panel, las últimas cargadas primero", async () => {
      await dominio.crearPieza({ nombre: "Primera" });
      await dominio.crearPieza({ nombre: "Segunda" });

      const piezas = await dominio.listarPiezasDelPanel();

      expect(piezas.map((p) => [p.codigo, p.nombre, p.estado])).toEqual([
        ["VT-0002", "Segunda", "en_preparacion"],
        ["VT-0001", "Primera", "en_preparacion"],
      ]);
    });
  });

  describe("código correlativo", () => {
    it("sale de la secuencia y nunca se reutiliza", async () => {
      await dominio.crearPieza({});
      const segunda = await dominio.crearPieza({});
      await base.borrarPiezaSinDominio(segunda.codigo);

      const tercera = await dominio.crearPieza({});

      expect(tercera.codigo).toBe("VT-0003");
    });

    it("usa el prefijo configurado", async () => {
      const otra = await crearBaseDePrueba({ prefijoDeCodigo: "VS-" });
      try {
        expect((await otra.dominio.crearPieza({})).codigo).toBe("VS-0001");
      } finally {
        await otra.cerrar();
      }
    });
  });

  describe("listas ampliables", () => {
    it("traen los valores iniciales de tipo, color y material", async () => {
      const { tipos, colores, materiales } = await dominio.listas();

      expect(tipos.map((t) => t.nombre)).toContain("Bandolera");
      expect(colores.find((c) => c.nombre === "Negro")?.muestra).toBe("#16130f");
      expect(materiales.map((m) => m.nombre)).toContain("Cuero");
    });

    it("la operadora puede sumar un valor nuevo y usarlo en una pieza", async () => {
      const riñonera = await dominio.ampliarLista("tipos", "  Riñonera ");

      const { codigo } = await dominio.crearPieza({ tipoId: riñonera.id });

      expect(riñonera.nombre).toBe("Riñonera");
      expect((await dominio.listas()).tipos.at(-1)).toEqual(riñonera);
      expect((await dominio.piezaDelPanel(codigo))?.tipoId).toBe(riñonera.id);
    });

    it("sumar un valor que ya existe devuelve el existente, sin duplicarlo", async () => {
      const { materiales } = await dominio.listas();

      const cuero = await dominio.ampliarLista("materiales", "cuero");

      expect(cuero).toEqual(materiales.find((m) => m.nombre === "Cuero"));
      expect((await dominio.listas()).materiales).toHaveLength(materiales.length);
    });

    it("no acepta un valor vacío", async () => {
      await expect(dominio.ampliarLista("colores", "   ")).rejects.toBeInstanceOf(ErrorDeDominio);
    });
  });

  describe("publicación", () => {
    it("lleva la pieza de En preparación a Disponible y registra la fecha", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());

      const publicada = await dominio.publicarPieza(codigo);

      expect(publicada.estado).toBe("disponible");
      expect(publicada.publicadaEn).toEqual(PUBLICADA_EL);
    });

    it("no publica una pieza incompleta y dice qué falta", async () => {
      const { codigo } = await dominio.crearPieza({
        ...(await bandolera()),
        precioCentavos: null,
        altoCm: null,
      });

      await expect(dominio.publicarPieza(codigo)).rejects.toMatchObject({
        motivo: "pieza_incompleta",
        errores: { altoCm: expect.any(String), precioCentavos: expect.any(String) },
      });
      expect((await dominio.piezaDelPanel(codigo))?.estado).toBe("en_preparacion");
    });

    it("no se publica dos veces", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await dominio.publicarPieza(codigo);

      await expect(dominio.publicarPieza(codigo)).rejects.toMatchObject({
        motivo: "transicion_no_permitida",
      });
    });

    it("una pieza publicada se puede seguir editando", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await dominio.publicarPieza(codigo);

      const editada = await dominio.editarPieza(codigo, { precioCentavos: 16000 });

      expect(editada).toMatchObject({ estado: "disponible", precioCentavos: 16000 });
    });

    it("una pieza publicada no puede quedar sin sus datos obligatorios", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      await dominio.publicarPieza(codigo);

      await expect(dominio.editarPieza(codigo, { nombre: "  " })).rejects.toMatchObject({
        errores: { nombre: expect.any(String) },
      });
    });
  });

  describe("ficha pública", () => {
    it("muestra solo los datos para la compradora, con Ref., tamaño y umbrales", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      const { rutaPublica } = await dominio.publicarPieza(codigo);

      const ficha = await dominio.fichaPublica(rutaPublica.replace("/carteras/", ""));

      expect(ficha).toEqual({
        codigo: "VT-0001",
        nombre: "Bandolera de cuero negra",
        ruta: rutaPublica,
        estado: "disponible",
        tipo: "Bandolera",
        color: "Negro",
        material: "Cuero",
        medidas: { altoCm: 22, anchoCm: 30, profundidadCm: 9, caidaCm: 55 },
        tamano: { nombre: "Mediana", rango: "de 25 a 32 cm de ancho" },
        tamanos: [
          { nombre: "Mini", rango: "menos de 18 cm de ancho" },
          { nombre: "Pequeña", rango: "de 18 a 24 cm de ancho" },
          { nombre: "Mediana", rango: "de 25 a 32 cm de ancho" },
          { nombre: "Grande", rango: "más de 32 cm de ancho" },
        ],
        precioCentavos: 18000,
        publicadaEn: PUBLICADA_EL,
      });
    });

    it("nunca expone el ID interno ni otros campos del panel", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      const { rutaPublica } = await dominio.publicarPieza(codigo);

      const ficha = await dominio.fichaPublica(rutaPublica.slice("/carteras/".length));
      const texto = JSON.stringify(ficha);

      expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
      for (const interno of ["id", "tipoId", "colorId", "materialId", "creadaEn", "actualizadaEn", "faltanParaPublicar"]) {
        expect(ficha).not.toHaveProperty(interno);
      }
    });

    it("una pieza En preparación no tiene ficha", async () => {
      const { rutaPublica } = await dominio.crearPieza(await bandolera());

      expect(await dominio.fichaPublica(rutaPublica.slice("/carteras/".length))).toBeNull();
    });

    it("un sufijo inexistente no tiene ficha", async () => {
      expect(await dominio.fichaPublica("bandolera-cuero-negra-zzzzzz")).toBeNull();
      expect(await dominio.fichaPublica("")).toBeNull();
      expect(await dominio.fichaPublica("-")).toBeNull();
    });

    it("sigue usando los umbrales de tamaño configurados", async () => {
      const otra = await crearBaseDePrueba({
        umbralesDeTamano: { pequenaDesde: 20, medianaDesde: 31, grandeDesde: 40 },
      });
      try {
        const { tipos, colores, materiales } = await otra.dominio.listas();
        const { codigo } = await otra.dominio.crearPieza({
          ...(await bandolera()),
          tipoId: tipos[0].id,
          colorId: colores[0].id,
          materialId: materiales[0].id,
        });
        const { rutaPublica } = await otra.dominio.publicarPieza(codigo);

        const ficha = await otra.dominio.fichaPublica(rutaPublica.slice("/carteras/".length));

        expect(ficha?.tamano).toEqual({ nombre: "Pequeña", rango: "de 20 a 30 cm de ancho" });
      } finally {
        await otra.cerrar();
      }
    });
  });

  describe("URL pública", () => {
    it("es un slug legible del nombre más un sufijo aleatorio corto", async () => {
      const { rutaPublica } = await dominio.crearPieza({ nombre: "Bandolera de Cuero Ñandú, negra!" });

      expect(rutaPublica).toMatch(/^\/carteras\/bandolera-cuero-nandu-negra-[0-9a-z]{6}$/);
    });

    it("no contiene el código correlativo", async () => {
      const { rutaPublica } = await dominio.crearPieza({ nombre: "Clutch dorado" });

      expect(rutaPublica).not.toContain("0001");
    });

    it("se mantiene aunque cambie el nombre: la dirección vieja sigue llevando a la pieza", async () => {
      const { codigo } = await dominio.crearPieza(await bandolera());
      const { rutaPublica: rutaVieja } = await dominio.publicarPieza(codigo);

      const { rutaPublica: rutaNueva } = await dominio.editarPieza(codigo, {
        nombre: "Bandolera negra clásica",
      });
      const porLaVieja = await dominio.fichaPublica(rutaVieja.slice("/carteras/".length));

      expect(rutaNueva).toMatch(/^\/carteras\/bandolera-negra-clasica-/);
      expect(rutaNueva.slice(-6)).toBe(rutaVieja.slice(-6));
      expect(porLaVieja?.codigo).toBe(codigo);
      expect(porLaVieja?.ruta).toBe(rutaNueva);
    });

    it("cada pieza tiene su propio sufijo", async () => {
      const rutas = new Set<string>();
      for (let i = 0; i < 20; i++) {
        rutas.add((await dominio.crearPieza({ nombre: "Tote" })).rutaPublica);
      }

      expect(rutas.size).toBe(20);
    });
  });
});
