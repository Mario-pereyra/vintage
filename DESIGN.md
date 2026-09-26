---
name: Vintage
description: Cada cartera es un comprobante verificado. Cuatro tintas planas sobre un campo rosa tajibo.
colors:
  rosa: "#e0457b"
  papel: "#ffffff"
  tinta: "#16130f"
  sello: "#2b3a8c"
  rosa-claro: "#f6c3d5"
  rosa-tinta: "#2a0716"
  tinta-2: "#5f5852"
  linea: "#bdb5ad"
  papel-2: "#f7eef2"
typography:
  ref:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "clamp(34px, 10.5vw, 52px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  total:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "tnum"
  cifra-campo:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "24px"
    fontWeight: 700
    fontFeature: "tnum"
  cifra:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.4
    fontFeature: "tnum"
  sello:
    fontFamily: "Martian Mono, ui-monospace, monospace"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.08em"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.25
  title-panel:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 800
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  renglon:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 500
    lineHeight: 1.4
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
  grupo:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    letterSpacing: "0.12em"
rounded:
  r-1: "4px"
  r-2: "8px"
  full: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "20px"
  s-6: "28px"
  s-7: "40px"
components:
  comprobante:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    padding: "28px 20px"
  sello:
    textColor: "{colors.sello}"
    typography: "{typography.sello}"
    rounded: "{rounded.r-1}"
    padding: "6px 10px 5px"
  boton-whatsapp:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.r-2}"
    height: "56px"
  boton-whatsapp-secundario:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.r-2}"
    height: "56px"
  tira-toma:
    backgroundColor: "transparent"
    textColor: "{colors.tinta}"
    padding: "6px 9px"
  tira-toma-activa:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
  chip:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.full}"
    padding: "0 14px"
    height: "40px"
  chip-activo:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.full}"
  segmento:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.r-2}"
    height: "46px"
  segmento-activo:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
  campo-texto:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.r-1}"
    padding: "12px"
    height: "48px"
  campo-numerico:
    textColor: "{colors.tinta}"
    typography: "{typography.cifra-campo}"
    padding: "6px 0"
  bloque-panel:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.r-2}"
    padding: "20px 16px"
  bloque-interno:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta-2}"
    rounded: "{rounded.r-2}"
    padding: "20px 16px"
  barra-panel:
    backgroundColor: "{colors.rosa}"
    textColor: "{colors.papel}"
    padding: "12px"
  btn-panel:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.r-2}"
    height: "52px"
  btn-panel-primario:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    rounded: "{rounded.r-2}"
    height: "52px"
  btn-panel-primario-deshabilitado:
    backgroundColor: "{colors.papel-2}"
    textColor: "{colors.tinta-2}"
  hoja-vista-previa:
    backgroundColor: "{colors.rosa}"
    textColor: "{colors.tinta}"
    rounded: "16px 16px 0 0"
    width: "420px"
---

# Design System: Vintage

## Overview

**Creative North Star: "El comprobante de pieza"**

Cada cartera se presenta como un comprobante verificado, no como una tarjeta de producto. La Ref. funciona como número de comprobante, los datos se leen como renglones medidos, el precio es el TOTAL bajo una regla doble y el estado es un sello de goma estampado sobre el mismo papel. La compradora lee una revisión que alguien hizo; la operadora, en el panel, llena ese mismo comprobante.

El mundo se imprime con cuatro tintas planas: un campo rosa tajibo que domina la página pública, papel blanco de comprobante con borde troquelado, tinta casi negra para texto y acción, y tinta azul de sello. No hay degradés visibles, sombras ni brillo: la profundidad sale de apoyar papel sobre rosa y de la mezcla del sello sobre el papel. Las cifras (Ref., precios, medidas, fechas) hacen el trabajo en Martian Mono; las palabras van en Archivo.

La densidad es de ticket: renglones compactos separados por puntos, jerarquía por tamaño de cifra y no por color. El panel de la operadora hereda las tintas y los componentes, pero baja el volumen del rosa para trabajar rápido con una mano.

**Key Characteristics:**
- Cuatro tintas planas (rosa, papel, tinta, sello) más tonos derivados; nada más.
- Papel de comprobante con borde troquelado arriba y abajo.
- Renglones con líneas punteadas; TOTAL con regla doble.
- Sello de goma girado (-8°) que se re-estampa al cambiar de estado.
- Cifras en monoespaciada tabular; texto en Archivo.
- Fotos siempre enteras, nunca recortadas.
- Una sola acción fuerte por pantalla, en tinta negra.

## Colors

Cuatro tintas planas de imprenta, sin mezclas visibles; los tonos derivados solo aclaran u oscurecen una de ellas para un rol concreto.

### Primary
- **Rosa tajibo** (rosa): el campo de toda la página pública, la barra superior del panel y el fondo de la hoja de vista previa. Es fondo, nunca texto pequeño ni borde de control.

### Secondary
- **Azul de sello** (sello): la tinta del sello de goma y de todo lo que significa "verificado o calculado": el conteo completo de tomas ("8 de 8"), el tamaño derivado de las medidas, el interruptor "Mostrar" encendido, el anillo de foco (3px, separación 3px) y la selección de texto.

### Neutral
- **Tinta** (tinta): texto principal, botón principal (WhatsApp, Publicar), estado activo de chips, segmentos y tira de tomas, reglas del TOTAL y de los grupos.
- **Papel** (papel): el comprobante, los bloques del panel, los campos y los botones secundarios.
- **Tinta suave** (tinta-2): etiquetas de renglón, notas, pie del comprobante y textos de ayuda sobre papel.
- **Línea** (linea): renglones punteados, bordes de chips y campos, huecos de toma vacíos, interruptor apagado. Solo trazo, nunca texto.
- **Rosa claro** (rosa-claro): fondo detrás de cada foto, para que la foto entera quede sobre rosa y no sobre blanco.
- **Rosa tinta** (rosa-tinta): texto secundario pequeño sobre rosa (miga de pan, notas).
- **Papel rosado** (papel-2): el campo del panel de la operadora (rosa muy diluido), los huecos de toma vacíos y el botón principal deshabilitado.
- **Divisores sobre rosa**: tinta al 20–25 % de opacidad (barra de acción fija, lista de entregas). **Velo de hoja**: tinta al 50 % detrás de la vista previa.

### Named Rules
**The Cuatro Tintas Rule.** Solo existen rosa, papel, tinta y sello; cualquier otro valor es un derivado de una de ellas con un rol fijo. Los colores de muestra de los chips de color (negro, café, beige, rojo, blanco) son datos de la pieza, no tintas del sistema.

**The Tinta Sobre Rosa Rule.** El texto pequeño sobre rosa va en tinta o rosa tinta. El blanco sobre rosa solo se usa en texto grande y en negrita (marca de 21px/800, título del panel de 20px/800) y en íconos de la barra; su contraste (unos 4:1) no alcanza para texto normal.

**The Rosa Solo Arriba Rule.** En el panel, el rosa aparece únicamente en la barra superior; el campo es papel rosado. La única excepción es la hoja de vista previa, porque muestra el mundo de la compradora.

## Typography

**Display Font:** Martian Mono (con ui-monospace, monospace), para cifras
**Body Font:** Archivo (con system-ui, sans-serif), para palabras
**Label/Mono Font:** Martian Mono con cifras tabulares

**Character:** Una monoespaciada ancha y técnica que imprime números como en un ticket, frente a una grotesca firme que carga las palabras sin adornos. El peso de la jerarquía lo llevan las cifras grandes.

### Hierarchy
- **Ref** (Martian Mono 700, clamp(34px, 10.5vw, 52px), 1, -0.04em): el número de comprobante "VT-0142", precedido por "Ref." en Archivo 500 de 15px en tinta suave. En la vista previa, 40px.
- **Total** (Martian Mono 700, 36px, 1, -0.04em): el precio en el TOTAL (30px en la vista previa; 40px en el campo de precio del panel).
- **Cifra de campo** (Martian Mono 700, 24px): las medidas que tipea la operadora.
- **Headline** (Archivo 800, 22px, 1.15, -0.01em): títulos de sección sobre el rosa.
- **Title** (Archivo 600, 19px, 1.25): el nombre de la pieza en el comprobante. En el panel, los bloques se titulan en Archivo 800 de 17px.
- **Body** (Archivo 400, 16px, 1.55, máximo 60ch): la descripción y los textos sobre rosa.
- **Renglón** (Archivo 500, 14.5px, 1.4, alineado a la derecha): el valor en palabras de un renglón; la etiqueta va a la izquierda en 14px tinta suave. Los valores numéricos van en **Cifra** (Martian Mono 400, 13.5px, 1.4).
- **Label** (Archivo 600, 14px): etiquetas de campo en el panel.
- **Grupo** (Archivo 800, 11px, 0.12em, mayúsculas): encabezado de sección del comprobante ("La pieza", "Revisión"), con regla de tinta de 1.5px debajo. Es el título de ese grupo de renglones, no una etiqueta sobre otro título.
- **Sello** (Martian Mono 700, 13px, 1.25, 0.08em, mayúsculas; línea secundaria en 400 de 10.5px sin mayúsculas).

### Named Rules
**The Cifras En Mono Rule.** Martian Mono se usa para Ref., precios, medidas, fechas, conteos, números de Drop, el campo de búsqueda por Ref. y las letras del sello de goma (que son parte del sello). Toda otra palabra va en Archivo, incluidos los valores en palabras de los renglones ("Bandolera", "Muy buena").

**The Cifras Tabulares Rule.** Toda cifra lleva `font-variant-numeric: tabular-nums` para que las columnas de medidas y precios se alineen como en un ticket.

## Layout

Mobile-first. La ficha pública es una sola columna sobre rosa, con un ancho máximo de 1120px. La foto ocupa casi todo el ancho (margen de 12px) en formato 1:1 en celular, para que la Ref. y el sello entren en el primer viewport de los navegadores integrados de TikTok, Instagram y WhatsApp. El comprobante sube 48px sobre el borde inferior de la foto y queda con margen lateral de 20px. Arriba de la foto va la tira de las 8 tomas nombradas.

Desde 900px, la ficha pasa a dos columnas (1.1fr la galería y los textos, 1fr el comprobante), separadas por 40px. La columna del comprobante es pegajosa (top 16px), la foto pasa a 4:5, el comprobante deja de solaparse con la foto y la acción de WhatsApp pasa de barra fija a botón debajo del comprobante.

El panel es una columna de 640px como máximo sobre papel rosado, con bloques de papel separados por 12px y un padding inferior de 140px para despejar la barra de acciones fija.

El ritmo usa la escala de espaciado s-1 a s-7 (4, 8, 12, 16, 20, 28 y 40px). Los renglones tienen 10px de padding vertical, los grupos se abren con 20px y el TOTAL con 20px arriba más 16px de padding. Las barras fijas suman `env(safe-area-inset-bottom)`.

### Named Rules
**The Foto Entera Rule.** Toda foto que ve la compradora se muestra completa (`object-fit: contain`) sobre rosa claro: 1:1 en celular y 4:5 en escritorio. Nunca se recorta para llenar un marco.

**The Pulgar Rule.** Las acciones principales miden 52–56px de alto, los chips 40px y los segmentos 46px; todo lo que se toca durante la carga se alcanza con una mano.

## Elevation & Depth

El sistema es plano. No hay `box-shadow` en ningún elemento. La profundidad sale del material: papel blanco apoyado sobre el campo rosa, el comprobante que se solapa 48px sobre la foto, y el sello que se imprime sobre el papel con `mix-blend-mode: multiply`, como tinta real. La única capa superpuesta es la hoja de vista previa, que se separa del panel con un velo de tinta al 50 %, no con sombra.

### Named Rules
**The Sin Sombras Rule.** Nada proyecta sombra ni lleva un degradé visible. El `radial-gradient` de la máscara del troquel es una herramienta de corte, no un relleno, y es la única excepción.

## Shapes

Esquinas casi rectas: 4px (r-1) para el sello, los campos, la búsqueda y las fotos, y 8px (r-2) para botones, bloques del panel y segmentos. Solo los chips y el interruptor son píldoras (999px), y la hoja de vista previa redondea 16px arriba.

La forma firma del sistema es el **borde troquelado** del comprobante: una fila de dientes semicirculares de 7px de radio cada 18px, recortados con máscara arriba y abajo (5px en los comprobantes mini). Los trazos son de 1.5px en todo el sistema (renglones punteados, chips, botones, segmentos, divisores). Las excepciones son parte del mundo: el sello tiene un borde de 3px, el campo numérico una línea de 2px debajo, el TOTAL una regla doble de 4px y el campo de precio una regla doble de 3px. Los huecos vacíos y "+ Otro" usan trazo discontinuo.

## Components

### Comprobante
El documento de la pieza. Es papel blanco con borde troquelado y padding de 28px × 20px. Lleva, en este orden: la Ref. en cifra grande con el sello a la derecha, el nombre de la pieza, los renglones de medidas, los grupos ("La pieza", "Revisión") con sus renglones, el TOTAL y el pie en cifra de 12px tinta suave ("Publicada 12/09 · DROP #03 · Una sola unidad"). La variante **mini** (148px de ancho, dientes de 5px) muestra las vendidas recientes con foto 1:1, nombre, Ref., precio y un sello "Vendida" pequeño sobre papel al 60 %. El mismo componente se usa en la vista previa del panel.

### Renglón
Es una fila de dos columnas (etiqueta de 7.5em y valor) alineadas por la línea base, separada de la siguiente por una línea punteada de 1.5px en tono línea. La etiqueta va en tinta suave y el valor alineado a la derecha, en Archivo si es una palabra y en cifra si es un número. Una aclaración opcional puede ir debajo en 12px ("alto × ancho × profundidad, cerrada"). En la variante **nota**, el valor es texto libre de hasta 30ch.

### TOTAL
La palabra TOTAL (Archivo 800, 13px, 0.14em) a la izquierda y el precio en cifra de 36px a la derecha, sobre una regla doble de tinta de 4px. Si hay un precio anterior, va tachado debajo en cifra de 13px tinta suave.

### Sello de goma
Un rectángulo con borde de 3px en tinta azul, radio de 4px y giro de -8°, impreso con multiply. Tiene una línea principal en mayúsculas y un detalle opcional debajo. Estados:
- **Revisada**: detalle de la revisión ("limpia · cierres ok").
- **Reservada**: con la hora de vencimiento ("hasta las 16:40").
- **Vendida**: con fecha y precio ("14/09 · Bs 180"). La galería se desatura al 50 %.
- **En preparación** y **Lista**: en el panel, según las tomas cargadas; en la vista previa, "no visible aún".

**Estampar:** al cambiar de estado, el sello entra en 0.42s con `cubic-bezier(.16, 1, .3, 1)`, desde escala 1.9, desenfocado y transparente, rebota a 0.94 y queda en 1. Con `prefers-reduced-motion: reduce` no se anima. Es la única animación con carácter del sistema.

### Botón de WhatsApp con Ref.
Una barra fija abajo sobre rosa, con un divisor de tinta al 20 %. Dentro va un botón de tinta de 56px de alto y radio de 8px, en Archivo 800 de 16px blanco, con el ícono de chat y la "Ref. VT-0142" en cifra de 12px al 75 %. El enlace precarga el mensaje con la Ref. y el nombre de la pieza. Al presionarlo se achica a 0.98 en 0.15s. Si la pieza está Reservada o Vendida, el botón pasa a papel con texto en tinta, pierde la Ref. y cambia de acción ("Avisame si se libera", "Ver carteras disponibles"). En escritorio deja de ser fijo.

### Tira de tomas
Botones numerados y con nombre ("1 Frente", "2 Dorso"…) sobre el rosa, con trazo de tinta de 1.5px y radio de 3px. La toma activa se rellena de tinta. Se sincroniza con el carrusel, que se desliza con scroll-snap.

### Chips
Píldoras de 40px de alto sobre papel, con trazo de línea de 1.5px y Archivo 500 de 14px. El chip seleccionado se rellena de tinta con texto blanco. Hay una sola selección por grupo. El chip "+ Otro" lleva trazo discontinuo y texto en tinta suave. Los chips de color llevan una muestra circular de 14px.

### Control segmentado
Una fila de 3 o 4 opciones iguales dentro de un marco de tinta de 1.5px con radio de 8px, separadas por filetes de tinta. Cada opción mide 46px de alto, en Archivo 600 de 13px. La opción activa se rellena de tinta. Se usa para escalas fijas: la Condición y la autenticidad (Comprobada, Atribuida, Sin marca).

### Interruptor "Mostrar"
Va en la etiqueta de cada campo opcional. Es una pista de 36 × 22px, en tono línea cuando está apagado y en tinta azul cuando está encendido, con una perilla de papel que se desliza 14px en 0.18s ease-out. Lo acompaña el texto "Mostrar" en 12px tinta suave. En la vista previa, un campo oculto aparece tachado al 35 %.

### Campos
- **Texto y selección:** fondo papel, trazo de línea de 1.5px, radio de 4px, padding de 12px, Archivo 15px. Al enfocarse, el trazo pasa a tinta. El select usa una flecha de tinta dibujada en SVG.
- **Numérico de medida:** sin caja. La cifra de 24px va sobre una línea de tinta de 2px, con la unidad "cm" en cifra de 12px tinta suave, y el teclado es decimal. Las tres medidas (alto, ancho y profundidad) van en una grilla de 3. Debajo, el tamaño derivado aparece en tinta azul.
- **Precio:** "Bs" en cifra de 22px y el valor en cifra de 40px sobre una regla doble de 3px, el eco del TOTAL.

### Bloque "Nunca se publica"
Un bloque del panel para datos internos (lote, condición de ingreso). Lleva un trazo de línea de 1.5px y el título en tinta suave. A la derecha va la marca con candado "Nunca se publica" (Archivo 600, 11px, 0.08em, mayúsculas, tinta suave). Siempre va al final del formulario.

### Barra de acciones del panel
Una barra fija de papel con un filete de línea arriba. Tiene tres columnas: el botón de vista previa (ícono de ojo, 52 × 52px), Guardar (secundario, papel con trazo de tinta) y Publicar (primario, tinta). Si Publicar está deshabilitado, pasa a papel rosado con trazo de línea y texto en tinta suave, y encima aparece la **línea de motivo** alineada a la derecha, en 13px tinta suave ("Faltan 2 tomas para publicar"). Nunca se deshabilita una acción sin decir por qué.

### Tomas del panel
Una grilla de 4 × 2 huecos en formato 4:5 con el número en cifra y el nombre de la toma. El hueco vacío tiene trazo discontinuo sobre papel rosado; el lleno va sobre rosa claro con el nombre en una etiqueta de papel. Para intercambiar dos fotos se tocan las dos; la primera se marca con un contorno de tinta azul de 3px.

### Hoja de vista previa
Una hoja inferior de 420px como máximo, sobre rosa, con radio de 16px arriba y un velo de tinta al 50 %. Muestra "Así la verá la compradora" y un botón de cierre en papel de 40px. Dentro va el comprobante tal como se publicaría.

### Navegación
- **Pública:** una barra fina sobre rosa con la marca (Archivo 800, 21px, blanco) y la búsqueda en papel (38px de alto, radio de 4px, cifra de 13px, "Ref. 142 o «tote»"). Debajo va la miga de pan en rosa tinta.
- **Panel:** una barra pegajosa de rosa con el botón volver (40px), el título en blanco (Archivo 800, 20px) y la Ref. asignada en una etiqueta de papel con cifra.

### Íconos
Trazo de 2px, sin relleno, extremos redondeados, en 20px (16px en la búsqueda y 14px en el candado), siempre en `currentColor`.

## Do's and Don'ts

### Do:
- **Do** usar solo las cuatro tintas (rosa, papel, tinta y sello) y sus derivados con el rol asignado.
- **Do** poner cada cifra (Ref., precio, medida, fecha, conteo) en Martian Mono tabular, y cada palabra en Archivo.
- **Do** separar los renglones con línea punteada de 1.5px y cerrar el comprobante con el TOTAL sobre una regla doble.
- **Do** expresar el estado de una pieza con el sello de goma y re-estamparlo al cambiar, respetando `prefers-reduced-motion`.
- **Do** mostrar cada foto entera sobre rosa claro: 1:1 en celular y 4:5 en escritorio.
- **Do** llevar siempre la Ref. en la acción de WhatsApp de una pieza Disponible.
- **Do** mantener el panel sobre papel rosado, con el rosa solo en la barra superior.
- **Do** acompañar toda acción deshabilitada con una línea que diga qué falta.
- **Do** usar el foco de tinta azul (3px, separación de 3px) en todo elemento interactivo.

### Don't:
- **Don't** usar sombras ni degradés visibles; la profundidad es papel sobre rosa.
- **Don't** poner texto blanco pequeño sobre rosa; solo texto grande y en negrita.
- **Don't** recortar una foto de la pieza para llenar un marco.
- **Don't** usar Martian Mono para frases o valores en palabras, fuera del sello y del campo de búsqueda por Ref.
- **Don't** usar el tono línea como color de texto.
- **Don't** llevar el rosa como fondo a los bloques o campos del panel.
- **Don't** agregar tintas nuevas para estados; el estado es el sello.
- **Don't** portar los controles de maqueta (el selector de estado "Disponible, Reservada, Vendida", "Cargar 6 fotos de muestra", el prefijo "Muestra ·" y las notas de muestra): no son parte del sistema.
