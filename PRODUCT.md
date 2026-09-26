# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React Router v8 (modo framework) sobre Cloudflare Workers, Postgres en Neon con Prisma y fotos en R2 (ver `docs/adr/0005`). Hay una sola app: el catálogo público y el panel `/admin`, que es una PWA instalable. No hay app nativa.

## Users

- **Compradora:** mujer en Santa Cruz de la Sierra o en otro departamento de Bolivia. Llega desde el celular, casi siempre por un enlace que vio en TikTok, Instagram, Facebook (publicación o live) o que le pasaron por WhatsApp. Busca una cartera única y quiere saber, antes de escribir, si está limpia, cuánto mide, qué le cabe, si es original y si la foto muestra la pieza real. El estudio de mercado propone cuatro perfiles, todos como hipótesis: orientada al precio, al estilo, a las marcas o a la "caza de oportunidades".
- **Operadora:** la dueña y el desarrollador. Usan el panel en Android y Windows para registrar lotes, cargar y fotografiar piezas, publicar, reservar, verificar pagos y ver la rentabilidad. Muchas veces cargan con el celular en una mano y la cartera en la otra.

## Product Purpose

Vender carteras de segunda mano seleccionadas y mostrarlas con la información suficiente para que la compradora confíe y escriba por WhatsApp decidida a comprar. Por dentro, el objetivo es aprender qué se vende, a qué precio y con qué margen, por lote y por proveedor. El éxito se mide así: fichas que responden las objeciones sin que haga falta preguntar, reservas que terminan en pago, y lotes cuya rentabilidad se conoce.

## Positioning

"La competencia vende carteras; esta tienda vende confianza para comprar una cartera usada." Cada pieza es única, se selecciona, se limpia y se revisa. Se fotografía con un mínimo de 8 tomas estandarizadas y se mide con un criterio fijo. La condición se expresa en una escala explícita. La marca solo se presenta como "Original" cuando está comprobada, y las vendidas quedan visibles como prueba. Pasa de "ropa usada barata" a "pre-loved seleccionado", sin volverse una boutique de lujo.

## Operating Context

- **Venta:** siempre por WhatsApp, con pago por QR bancario verificado a mano. No hay checkout. No hay local físico.
- **Reservas:** las registra la operadora cuando la compradora escribe. Duran 15 minutos si nacen en un live y 2 horas fuera de él.
- **Drops:** lanzamientos numerados ("DROP #03 — 20 carteras nuevas") que se promocionan en las redes.
- **Entrega:** retiro, delivery en Santa Cruz o envío a otro departamento por encomienda o flota.
- **Referencia de pieza:** la compradora la nombra por su referencia ("Ref. VT-0142"), que también está en la etiqueta física.
- **Conexión:** las compradoras navegan con datos móviles y el panel se usa en el mismo contexto.

## Capabilities and Constraints

- **Catálogo:** listado con filtros por tipo, color, tamaño y precio. Estados Disponible y Reservada. "Ver vendidas" aparte. La ficha tiene su URL descriptiva y vista previa (Open Graph) para WhatsApp y Facebook.
- **Ficha de pieza:**
  - Siempre visibles: Ref., precio, tipo, color, material, medidas alto × ancho × profundidad en cm, caída del asa, tamaño (Mini, Pequeña, Mediana o Grande, con umbrales publicados) y 8 fotos mínimas: frente, dorso, lateral, base y esquinas, interior, herrajes y cierre, asas, y puesta en una persona.
  - Opcionales, con un interruptor por campo: condición, nota de condición, marca y autenticidad (juntas), cierre, interior, herrajes, "Incluye" y "Qué cabe".
  - Descripción de 2 a 4 frases.
- **Precios:** muy variados. Van aproximadamente de Bs30 a Bs500, con piezas en Bs30, 80, 150, 300 y 500, y no están limitados a esas bandas. Una pieza barata y una cara conviven en el mismo catálogo.
- **Restricciones técnicas:** las fotos se redimensionan en el navegador (no hay procesamiento en el servidor), no hay modo offline y el presupuesto es de 0 USD al mes.
- **Terminología:** ver `CONTEXT.md` (Pieza, Condición, Reserva, Drop, Compradora, Operadora…). No se usan "producto", "clienta" ni "apartado".
- **Marca y contacto:** Vintage Secret's; prefijo de código `VT-`; WhatsApp de la tienda +591 69647971.
- **Umbrales de tamaño:** configurables por la operadora (valores iniciales: Mini <18, Pequeña 18–24, Mediana 25–32, Grande >32 cm de ancho); la ficha siempre muestra los vigentes.

## Brand Commitments

- Nombre de marca: **Vintage Secret's** (confirmado por la dueña). El wordmark de la maqueta ("vintage") se reemplaza por este nombre al portar el diseño.
- Identidad visual "Comprobante de pieza" aprobada por la dueña (ver DESIGN.md).
- Todavía no hay logo ni redes con estética propia.

## Evidence on Hand

- No hay fotos reales de piezas: los bocetos usan marcadores rotulados y no deben inventar piezas ni fotos como si fueran reales.
- No hay testimonios, cifras de ventas ni prensa: no se fabrican.
- Hay investigación en `docs/research/`: estudio de mercado, buenas prácticas de ficha y reservas en lives.

## Product Principles

1. **Responder antes de que pregunten.** Cada ficha resuelve las objeciones típicas (limpieza, medidas, qué cabe, originalidad, si la foto es la pieza real) antes de llegar a WhatsApp.
2. **Honestidad verificable.** Nada se afirma sin respaldo: la condición usa una escala fija, "Original" exige una marca comprobada y los detalles que quedan se muestran.
3. **Cada pieza es única.** Hay una sola unidad; Reservada y Vendida son información de valor, no errores.
4. **WhatsApp es el cierre.** El sitio lleva a la conversación con la referencia exacta; no imita un e-commerce con carrito.
5. **El panel es para una mano y poco tiempo.** La operadora carga piezas en el celular, entre fotos y lives; la velocidad y la claridad importan más que la densidad.

## Accessibility & Inclusion

Se prioriza el uso en celulares Android de gama media con datos móviles: poco peso, texto legible al sol y botones cómodos para una mano. Además, se aplica el estándar general WCAG AA.
