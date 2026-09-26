# Ficha de pieza: qué muestran las tiendas de carteras de segunda mano que funcionan

Investigación para diseñar la ficha pública de una **pieza** (cartera única, Bs40–Bs900, cierre por WhatsApp).
Fecha: 2026-09-26. Términos de dominio según `CONTEXT.md` (Pieza, Condición, Nota de condición, Autenticidad).

**Cómo se verificó.** Rebag y Fashionphile: se leyeron fichas reales (HTML y `products.json` de Shopify). Vestiaire: una ficha real y los artículos de su centro de ayuda. The RealReal: su FAQ oficial de condición. Vinted y Depop: su ayuda oficial y la especificación de la API de Depop. GoTrendier: fichas reales. The RealReal (fichas), ThredUp y Poshmark (fichas) bloquean la lectura automática (403/CAPTCHA). Lo que se dice de sus fichas viene de fragmentos de buscador y va marcado con **(S)**.

---

## 1. Tabla comparativa de campos en la ficha

| Campo | Rebag | Fashionphile | The RealReal | Vestiaire | Vinted / Depop / Poshmark | ThredUp | GoTrendier (MX/CO) |
|---|---|---|---|---|---|---|---|
| **Medidas** | Height, Width, Depth en pulgadas `"` [1] | "Size": Base length, Height, Width en `in` [3] | Height, Width, Depth en pulgadas (S) [7] | Width, Height, Depth en `in` (o cm según región) [5] | Texto libre en la descripción; sin campo de medidas | Height, Width, Depth en pulgadas (S) [14] | Texto libre en cm ("28cm de largo 20cm de alto") [12] |
| **Caída del asa / correa** | Sí, dos campos: *Handle Drop* y *Strap Drop* (pone "None" si no tiene) [1] | Sí: "Drop" repetido (asa y correa) [3] | *Handle Drop* (S) [7] | No (solo alto, ancho y profundidad) [5] | No | No confirmado | A veces, en texto libre ("120cm de asa larga") [12] |
| **Escala de condición** | 5 niveles (Pristine…Fair) [1][2] | 5 niveles con barra visual de la escala en la ficha [3] | 6 niveles (Pristine…As Is) [6] | 5 niveles [5][8] | Vinted 5–6, Depop 5 [9][10] | 3 niveles (S) [15] | 5 niveles [11] |
| **Defectos / desgaste** | Detallados **por zona**: `Exterior: … | Interior: … | Hardware: …` [1] | Detallados por zona: Interior / Hardware / Exterior [3] | Nota corta de condición (S) [7] | Se aceptan si **se ven en fotos o se mencionan**; los de higiene cancelan la venta [8] | Se pide mostrarlos en fotos [9] | Notas como "minor pilling" (S) [15] | Texto libre ("asas con un poco de desgaste") [11] |
| **Material** | Exterior Material + Interior Material [1] | En la descripción [3] | En los detalles (S) | Campo *Material* [5] | Campo (Depop: `material`) [10] | Campo (% de material) (S) [14] | Campo *Material* [11] |
| **Color** | Exterior Color + Interior Color [1] | En el título y la descripción [3] | En el título (S) [7] | Campo *Color* [5] | Campo; Depop admite hasta 2 [10] | Campo (S) | Campo *Color* [11] |
| **Marca / autenticidad** | Designer + Model + código de marca/fecha + "professional pictures of the actual item" [1] | "This is an authentic…" + certificado de autenticidad incluido [3] | Autenticación centralizada (S) | Designer + autenticación opcional pagada al comprar [5] | Marca como campo; fotos de etiqueta y logo para probar autenticidad [9] | Marca | Campo *Marca* [12] |
| **Interior / compartimentos** | Material y color del interior [1] | En prosa: "burgundy leather interior with patch pockets" [3] | En los detalles (S) | En la descripción | En la descripción | – | En la descripción |
| **Cierre** | En la descripción | En prosa: "CC turn-lock", "top zipper opens to…" [3] | En los detalles (S) | En la descripción | En la descripción | – | En la descripción ("cierres de marca") [11] |
| **Herrajes** | *Hardware Color* (p. ej. "Gold Tone", "Brushed Palladium") [1] | En prosa ("brushed gold hardware") [3] | En los detalles (S) | – | – | – | – |
| **Accesorios incluidos** | *Accessories*: "Dust Bag" / "No Accessories" [1] | *Comes With* (p. ej. certificado) [3] | Solo implícito en la escala (Pristine = con tags, caja y dust bag) [6] | *Sold with* (p. ej. "Original box") [5] | Se pide listarlos y fotografiarlos [16] | – | – |
| **Fotos** | 3–7 por pieza en la muestra, "professional pictures of the actual item" [1] | 10 por pieza en la muestra [3] | Varias, con fondo blanco (S) | 15 en la ficha leída; mínimo 2 obligatorias [5][13] | Vinted hasta 20; Depop 1–8; Poshmark hasta 16 + video [17][10][18] | – | 7 en la ficha leída [11] |
| **"Qué cabe"** | Solo en guías editoriales por modelo ("can fit your keys, a small wallet, your phone…") [19] | No | No | No | No | No | No |
| **Talla / categoría de tamaño** | Etiqueta interna de tamaño (small/medium), en general según el nombre del modelo [1] | No como campo | No | No | Talla "única" | "One size" (S) [14] | Talla "Única" [11] |
| **Origen / ubicación** | Tienda física donde está la pieza (en etiquetas) [1] | – | – | *Location*: país y vendedor [5] | Ubicación del vendedor [10] | – | Ubicación y envío [11] |
| **Precio de referencia** | *Estimated Retail Price* [1] | – | – | – | – | Precio retail estimado vs. precio actual (S) [14] | – |
| **Nº de ítem / referencia** | Item Number [1] | Item # [3] | Item # (S) [7] | Reference [5] | – | Item # (S) | – |

**Patrón clave.** Las tiendas curadas (Rebag, Fashionphile) usan **campos estructurados fijos**: medidas con caídas, condición con desglose por zona, material y color separados en exterior e interior, color de herrajes y accesorios. Los marketplaces entre particulares (Vinted, Depop, Poshmark, GoTrendier) dejan casi todo en texto libre, y ahí las medidas y los defectos aparecen de forma inconsistente.

---

## 2. Escalas de condición (textuales)

**Fashionphile** (la leyenda aparece en la propia ficha) [3]
- *Giftable*: nuevo, con caja, estuche o etiquetas originales.
- *New*: "Item appears unused. May contain faint signs of wear due to storage conditions."
- *Excellent*: "Item is clean and contains very little wear. Any notable flaws or signs of wear are stated in the listing."
- *Very Good*: "shows some wear and signs of previous use, but still has a lot of life in it. Slightly worn corners, creases in leather, and tarnished hardware may be visible."
- *Good*: "moderate signs of prior use. Surface scratches, slight darkening in handles… will be noted in the listing."
- *Fair*: "noticeable signs of wear such as well scuffed edges or significant scratches. Please read the condition notes… and inspect photos before purchasing."

**The RealReal** [6]: *Pristine* (nuevo; puede traer tags, dust bag o caja) → *Excellent* ("like new or gently worn") → *Very Good* ("minor sign(s) of wear… lightly worn corners, light scratches and interior wear") → *Good* ("moderate… worn corners, moderate scratches and interior wear") → *Fair* ("heavy… heavily worn corners, scratches and interior wear") → *As Is* ("extensive… may require repair… broken hardware or small holes or tears").

**Rebag** [1][2]: Pristine → Excellent → Great → Good → Fair. La ficha siempre muestra `Nivel. Exterior: … | Interior: … | Hardware: …`. Ejemplo real: "Great. Exterior: scuffs, creases | Interior: cracking on flap opening corners, scuffs | Hardware: minor scratches".

**Vestiaire Collective** [5][8][13]: Never worn with tag / Never worn / Very good / Good / Fair. Su guía visual enumera los defectos aceptados en cada nivel. *Very good*: desgaste de esquinas, cuero reteñido, manchas. *Good*: además decoloración, agujeros, bolitas, rayones u oxidación. *Fair*: además hilos jalados. Reglas: "If you can't decide between two quality ratings, choose the lower one", y "vintage is not a condition but a period".

**Vinted** [9]: New / Like new / Very good ("gently-used… minor imperfections that don't affect its overall appearance or use") / Good ("regularly-used… shows wear, but still works well") / Satisfactory ("well-used… clear signs of wear and imperfections, but still works as intended").

**Depop** (enum de la API) [10]: `brand_new`, `used_like_new`, `used_excellent`, `used_good`, `used_fair`.

**GoTrendier** [11]: A estrenar con etiqueta / A estrenar sin etiqueta / Puesto una vez / En perfecto estado / Usado. En la práctica casi todo cae en "Usado", y el matiz real queda en la descripción.

**ThredUp (S)** [15]: New with tags / Like new / Gently used, con notas del tipo "minor pilling".

**Qué tienen en común.** Todas usan entre 4 y 6 niveles. Cada nivel se define con **ejemplos concretos de defectos típicos de cartera**: esquinas, rayones en herrajes, oscurecimiento de asas, interior. Y la escala va siempre **acompañada de notas específicas de la pieza**; nunca aparece sola.

---

## 3. Cómo expresan medidas y tamaño

- **Tres dimensiones más las caídas.** Alto, ancho (o largo de base) y profundidad, más la caída del asa y la de la correa [1][3]. Rebag escribe "None" cuando la pieza no tiene asa o correa en lugar de omitir el campo, y admite rangos para correas regulables ("4.5-8.5\"") [1][20].
- **Método de medición explícito (Vestiaire)** [4]: alto = cartera cerrada sobre superficie plana, sin contar asas; ancho = ancho de la base; profundidad (opcional) = la parte más ancha de frente a dorso; los bolsillos externos se excluyen. Además publican una **tolerancia** (ejemplo: declarar 20 cm y medir 22 cm se acepta).
- **Unidades.** Los sitios de EE. UU. usan pulgadas. GoTrendier, en Latinoamérica, usa cm [12]. No se encontró ninguna tienda que muestre ambas unidades.
- **Categorías Mini/Small/Medium/Large.** No son un campo estándar en la ficha. Rebag guarda una etiqueta de tamaño derivada del **nombre del modelo** ("Serpenti… Small") [1]. Los rangos en cm que publican guías de terceros no coinciden entre sí (mini ~15–22 cm, small ~20–26, medium ~22–32, large ≥33–35) [21]. Por eso, si se usa una categoría, conviene que la tienda **fije y publique sus propios umbrales**.
- **"Qué cabe".** Solo aparece en contenido editorial por modelo, por ejemplo en Rebag: "The Mini can fit your keys, a small wallet, your phone…" [19]. Nadie lo pone en la ficha de pieza única, pero Baymard muestra que la gente entiende mejor el tamaño con referencias familiares que con números (un participante: "the fact that it says it 'fits in the palm of your hand' means it is quite small") [22].
- **Foto a escala.** Según Baymard, el 42% de los usuarios intenta deducir el tamaño a partir de las fotos, y los productos que se llevan puestos (bolsos incluidos) deben mostrarse **sobre una persona** [22][23]. Vestiaire prohíbe que la **foto principal** sea con la cartera puesta o en maniquí, pero la acepta como foto adicional [13].

---

## 4. Campos recomendados para nuestra ficha de pieza

### (a) Estructurados obligatorios
1. **Código de pieza** (`SCZ-0001`): el equivalente del Item #/Reference que usan todas [1][3][5]. Sirve para citarlo en WhatsApp ("me interesa la SCZ-0014").
2. **Precio publicado** en Bs (y el anterior tachado si hay rebaja).
3. **Tipo de cartera** (hombro, de mano, bandolera, tote, clutch…).
4. **Marca y autenticidad** en 3 estados, según ADR 0002: *Original (marca comprobada)* / *Marca atribuida, sin autenticar* / *Sin marca*. Si no hay marca, poner "Sin marca" explícitamente, sin inventar un "estilo X".
5. **Condición** en la escala propia (Excelente / Muy buena / Buena / Con detalles), con la leyenda de la escala visible en la ficha, como hace Fashionphile [3].
6. **Medidas en cm**: alto × ancho × profundidad, medidas con el método de Vestiaire [4].
7. **Caída del asa** y **caída de la correa** en cm. Escribir "No tiene" en lugar de omitirlas, y dar un rango si la correa es regulable [1].
8. **Material exterior** (cuero, cuero sintético, lona, nylon, paja…), marcado como "aparente" cuando no se pueda comprobar.
9. **Color exterior**.
10. **Estado de la pieza** (Disponible / Reservada / Vendida visible).

### (b) Estructurados opcionales (mostrar solo si hay dato)
- **Desglose de condición por zona**: Exterior / Interior / Herrajes / Asas, con frases cortas [1][3]. Es la práctica más consistente de las tiendas curadas.
- **Nota de condición** con foto enlazada del detalle.
- **Cierre**: cremallera, broche magnético, solapa, botón, abierta.
- **Interior**: material y color, más compartimentos (bolsillos con cierre o abiertos, porta-celular).
- **Color de herrajes**: dorado, plateado, bronce, negro [1].
- **Incluye**: correa extra, dust bag, tarjeta o tag original. Si no incluye nada, no mostrar el campo o poner "Solo la cartera", como el "No Accessories" de Rebag [1].
- **Tamaño** (Mini/Pequeña/Mediana/Grande) con umbrales en cm propios y publicados.
- **Qué cabe**, verificado físicamente con iconos o checklist fija: celular grande, billetera larga, lentes con estuche, botella 500 ml, tablet o laptop. Es una ventaja diferencial: nadie lo tiene por pieza.
- **Forma de llevarla**: a mano, al hombro, cruzada. Se deduce de las caídas.
- **Modelo o línea** (solo para marca comprobada: p. ej. Coach "Poppy").

### (c) Descripción libre (2–4 frases)
Qué la hace especial, cómo combina o para qué ocasión sirve, y cualquier detalle que no entre en los campos. No debe repetir lo que ya dicen los campos.

### Qué NO conviene poner
- **Puntajes tipo "9/10"** ni condición sin definición: la escala sola, sin leyenda ni notas, no informa. `CONTEXT.md` ya lo evita.
- **"Original", "100% auténtica" o "tipo Coach / inspirada en MK"** sin comprobación: genera desconfianza y roza la falsificación (ADR 0002).
- **Adjetivos vacíos** ("hermosa", "divina", "impecable") en lugar de datos. Vinted y Vestiaire piden descripciones precisas de color, material y tamaño [9][13].
- **Fotos de catálogo o stock** de la marca: Vinted las prohíbe porque "may not show the current condition" [17].
- **Precio retail inflado** ("valía $300"): Rebag y ThredUp lo usan, pero en piezas genéricas o sin comprobar no se puede sostener.
- **Ocultar defectos**: en Vestiaire la pieza se considera conforme solo si el defecto "is visible in the photos or clearly mentioned" [8]. Hay una tensión con `CONTEXT.md`, donde la Nota de condición es opcional: la evidencia sugiere que, si una pieza se publica en "Buena" o "Con detalles", la nota o la foto del detalle debería ser obligatoria.
- **Datos de procedencia interna** (lote, fardo, proveedor, costo): son del inventario, no de la ficha.
- **Campos vacíos o "N/A"** visibles y datos que no aplican a carteras (talla, composición textil en %).

---

## 5. Set mínimo de fotos por pieza

Basado en las guías de Vinted [17], Vestiaire [13], Poshmark [16][18] y Baymard [22][23]: fondo liso, luz natural, sin filtros ni collages, formato constante (cuadrado o 4:5), siempre fotos propias de la pieza.

| # | Foto | Por qué |
|---|---|---|
| 1 | **Frente completo** (portada), cartera sola sobre fondo liso | Portada obligatoria en Vinted y Vestiaire; Vestiaire no admite modelo en la principal [13][17] |
| 2 | **Dorso** | Muestra rayones y manchas del lado menos cuidado |
| 3 | **Lateral / fuelle** | Da la profundidad |
| 4 | **Base y esquinas** | Es la zona de desgaste nº 1 en todas las escalas [3][6] |
| 5 | **Interior abierto** | Forro, bolsillos, limpieza |
| 6 | **Herrajes y cierre** en primer plano | Rayones y oxidación; Poshmark pide "details of the hardware" [16] |
| 7 | **Asas / correa**, incluido el punto de unión | Oscurecimiento y grietas en asas [3] |
| 8 | **Puesta en una persona** (hombro o cruzada) | Foto a escala: la forma más efectiva de comunicar tamaño [22][23] |
| + | **Cada defecto** mencionado, en primer plano | Requisito explícito en Vinted y Vestiaire [8][17] |
| + | **Etiqueta, logo o número de serie** (solo con marca) | Evidencia de autenticidad [16][17] |
| + | Accesorios incluidos (correa extra, dust bag) | Poshmark lo pide [16] |

Mínimo: **8 fotos** más las de defectos y marca. Queda dentro del rango observado (7–15) y cerca del máximo de Depop (8) [10]. Opcional de alto valor: una foto "qué cabe" con los objetos de la checklist dentro o al lado.

---

## 6. Fuentes

1. Rebag, fichas reales (JSON de Shopify): https://shop.rebag.com/products.json?limit=3 · ejemplo: https://shop.rebag.com/products/handbags-bvlgari-serpenti-forever-shoulder-bag-leather-small4369412
2. Rebag, página de condiciones: https://www.rebag.com/condition_page/ (niveles confirmados en las fichas; definiciones vía buscador)
3. Fashionphile, ficha real con leyenda de condición, desglose y "Size": https://www.fashionphile.com/products/chanel-lambskin-quilted-medium-double-flap-black-1982291 · JSON: https://www.fashionphile.com/products.json?limit=3
4. Vestiaire, medidas y tolerancias: https://faq.vestiairecollective.com/hc/en-gb/articles/18855242778129-Buyer-Item-Measurements-on-Vestiaire-Collective
5. Vestiaire, ficha real de Coach (Details, Measurements, Sold with, Location, 15 fotos): https://www.vestiairecollective.com/women-bags/handbags/coach/black-leather-coach-handbag-55129393.shtml
6. The RealReal, definiciones de condición: https://therealreal.zendesk.com/hc/en-us/articles/230906148-What-do-your-condition-descriptions-mean-
7. (S) The RealReal, fichas de Coach con Handle Drop/Height/Width/Depth: https://www.therealreal.com/products/women/handbags/handle-bags/coach-leather-top-handle-bag-rx4ub
8. Vestiaire, condiciones (comprador y vendedor): https://faq.vestiairecollective.com/hc/en-gb/articles/19922922894225-Buyer-Item-Conditions-on-Vestiaire-Collective · https://faq.vestiairecollective.com/hc/en-us/articles/17975062929041-Seller-Item-Conditions-on-Vestiaire-Collective · guía visual: https://faq.vestiairecollective.com/hc/en-gb/articles/19922747002257-Buyer-A-visual-guide-to-the-condition-of-items
9. Vinted, condición: https://www.vinted.com/help/50-choosing-item-condition
10. Depop, especificación de la API (condición, `pictures` 1–8, colores, material, dirección): https://partnerapi.depop.com/api-docs/openapi.yaml · https://partnerapi.depop.com/api-docs/getting-started/your-first-listing/
11. GoTrendier, ficha real de Coach: https://www.gotrendier.mx/p/bolsa-coach-usada-original-22452762
12. GoTrendier, ficha real con medidas en cm y asa: https://www.gotrendier.mx/p/bolsa-giani-bernni-azul-17224890
13. Vestiaire, "Creating the Perfect Listing": https://faq.vestiairecollective.com/hc/en-us/articles/209239625-Seller-Creating-the-Perfect-Listing
14. (S) ThredUp, ficha de Coach: https://www.thredup.com/product/women-leather-coach-black-leather-shoulder-bag/186625268 · ayuda de medidas: https://help.thredup.com/en_us/what-are-the-sizing-and-item-details-on-thredup-H1nZ9W09h
15. (S) ThredUp, condiciones (fuente secundaria): https://www.frompenniestoplenty.com/blog/thredup-vs-poshmark-for-buyers
16. Poshmark, cómo publicar un artículo de lujo: https://poshmark.com/posh_guide/how_to_list_luxury_item
17. Vinted, qué fotos subir (hasta 20): https://www.vinted.com/help/48-what-photos-you-should-upload
18. Poshmark, guía de fotografía (hasta 16 fotos + 1 video): https://blog.poshmark.com/2020/01/16/the-poshmark-listing-photography-guide/
19. Rebag The Vault, guía de tamaños con "can fit": https://www.rebag.com/thevault/size-guide-fendi-baguette/
20. (S) Rebag, rangos de caída en fichas: resultados de búsqueda sobre fichas Rebag/Walmart (p. ej. https://www.walmart.com/ip/17735272465)
21. Guías de terceros sobre categorías de tamaño (no normativas): https://www.bagsbybalaj.com/handbag-size-guide/ · https://shopappose.com/blogs/news/what-fits-in-a-handbag-a-size-by-size-guide-for-real-days
22. Baymard, imágenes "In Scale": https://baymard.com/blog/in-scale-product-images
23. Baymard, producto en modelo humano (bolsos incluidos): https://baymard.com/blog/human-model

**Latinoamérica y Bolivia.** No se encontró ninguna tienda boliviana de carteras de segunda mano con ficha web estructurada. La oferta local visible está en Instagram, TikTok, Facebook Marketplace y Evisos, con fichas de texto libre. The Preloved Shop (Panamá, https://theprelovedshop.com/collections/carteras) muestra fichas mínimas: 3–5 fotos, material y un tag de condición "Muy Bueno", sin medidas. Es un contraejemplo útil de lo que no conviene hacer.
