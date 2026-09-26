---
version: 1
slug: "design-maqueta-ficha-html"
primary_target: "design/maqueta/ficha.html"
related_targets: ["design/maqueta/carga.html"]
---

## Scope
Ficha de pieza pública (Persuade), mobile-first; la carga de pieza en el panel (Operate) hereda este mundo. Es una maqueta estática en `design/maqueta/` hasta que exista el esqueleto de la app (#2); después se porta a los componentes base.

## Audience and job
La compradora llega por un enlace desde TikTok, Instagram o WhatsApp y debe confiar en la pieza sin preguntar: limpieza, medidas, qué le cabe, condición, originalidad y estado. La acción es escribir por WhatsApp con la Ref. La operadora carga piezas con una mano: primero saca las fotos con la cámara y después las asigna desde la galería.

## Direction contract
THESIS: Cada cartera es un comprobante verificado. La ficha rechaza el arreglo típico de la categoría (galería blanca, nombre, precio, botón) y lo reemplaza por un documento: la Ref. como número de comprobante, los datos como renglones medidos, el precio como TOTAL y el estado como un sello.
OWN-WORLD: Un campo rosa tajibo (#E0457B) domina toda la página. Encima va papel de comprobante blanco con los bordes troquelados, tinta casi negra (#16130F) y un sello de goma en tinta azul (#2B3A8C). Solo cuatro tintas planas, sin degradés ni sombras. Las cifras van en monoespaciada (Martian Mono) y el texto en Archivo. Los renglones se separan con líneas punteadas y el TOTAL con una regla doble.
STORY: La compradora ve la pieza, lee su comprobante como una revisión hecha por alguien, entiende el estado por el sello y escribe por WhatsApp con la Ref. ya escrita.
FIRST VIEWPORT: Barra fina (marca y la búsqueda "Ref. 142"). Arriba de la foto, la tira de las 8 tomas nombradas. La foto ocupa casi todo el ancho sobre el rosa: 1:1 en celular (para que la Ref. y el sello entren en el primer viewport de los navegadores de TikTok, Instagram y WhatsApp) y 4:5 en escritorio, siempre mostrando la foto entera, sin recortarla. El comprobante sube 48 px sobre el borde de la foto y empieza con VT-0142 en cifras de unos 44 px y el sello. El botón de WhatsApp queda fijo abajo, en tinta negra.
FORM: Comprobante de pieza. Es el candidato 7 de la lista ordenada y el que asignó el sorteo, con la semilla 48915629. Tiene cuatro refuerzos:
- **Teletexto:** cada pieza tiene un número que se tipea para abrirla.
- **BLAST:** las cifras hacen el trabajo.
- **WPA:** cuatro tintas planas.
- **Ciudad de noche:** los estados son sellos del mismo comprobante (REVISADA, RESERVADA con la hora de vencimiento, VENDIDA con fecha y precio).

La interacción distintiva es el re-sellado: al cambiar el estado, el sello se estampa (con un golpe corto, respetando prefers-reduced-motion).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- El nombre de marca (Vintage es provisional).
- Los umbrales de tamaño.
- Si el rosa se mantiene en el panel o allí solo se usa como acento: se decide al construir la pantalla de carga.
