# Infraestructura gratuita (0 USD/mes) para la tienda: hosting, Postgres e imágenes

Fecha de consulta de todas las fuentes: 2026-09-26. Alcance: capas gratuitas vigentes de hosting, Postgres y almacenamiento/optimización de imágenes para una app TypeScript full-stack **comercial** (catálogo público de ~50–500 piezas únicas con ~8–10 fotos cada una, panel interno para 2 usuarios, tráfico bajo e incierto).

**Convención de este documento**

- **[E]** Evidencia: está en la fuente oficial enlazada (pricing, docs, términos).
- **[I]** Inferencia: conclusión mía a partir de la evidencia o del contexto del negocio.
- "No encontrado" significa que la fuente oficial consultada no lo dice; no equivale a "permitido".

**Supuesto de volumen [I].** 500 piezas × 9 fotos ≈ 4.500 originales. Si cada foto se guarda a ~1600 px en WebP (~200–300 KB), el total ronda 1–1,4 GB. Con 2–3 tamaños derivados (miniatura, detalle y Open Graph), el catálogo necesita entre 9.000 y 13.500 imágenes distintas. Este número es el que rompe varias capas gratuitas de "transformación de imágenes".

---

## 1. Hosting

| Servicio | ¿Uso comercial en gratis? | Límites relevantes | ¿Duerme? | ¿Tarjeta? | Trampas |
|---|---|---|---|---|---|
| **Vercel Hobby** | **No.** [E] "Hobby teams are restricted to non-commercial personal use only". Anunciar la venta de un producto ya cuenta como uso comercial ([Fair Use](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage)) | [E] 1M invocaciones, 4 h de Active CPU, 360 GB-h de memoria, 100 GB Fast Data Transfer, 1M Edge Requests, 5K transformaciones de imagen al mes ([Hobby](https://vercel.com/docs/plans/hobby)) | No (serverless) | No [I] | [E] Si superas un límite, esperas 30 días ([Hobby](https://vercel.com/docs/plans/hobby#hobby-billing-cycle)). **Descartado para esta tienda por los términos.** |
| **Cloudflare Workers** (y Pages) | **Sí, no hay prohibición.** [E] Los términos de servicio no prohíben el uso comercial en Free. Sí limitan servir "a disproportionate percentage of pictures" por la CDN sin servicios de pago, y citan Developer Platform/Images como la vía correcta ([Service-specific terms](https://www.cloudflare.com/service-specific-terms-application-services/)) | [E] 100.000 requests/día, 10 ms de CPU por request, 128 MB de memoria ([Limits](https://developers.cloudflare.com/workers/platform/limits/)). [E] Los assets estáticos son "free and unlimited" ([Pricing](https://developers.cloudflare.com/workers/platform/pricing/)). [E] Desde el 2026-09-04 el tamaño máximo del Worker es de 64 MiB sin comprimir en todos los planes; se eliminó el tope de 3 MB comprimido ([Changelog](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/)) | No. Son isolates y el arranque en frío es despreciable [I] | No para Workers [I] | [E] Esperar I/O (fetch, consultas a la DB) no cuenta como CPU. Si un Worker pasa de los 10 ms de CPU de forma sostenida, devuelve el error 1102. Pasar de 100k requests/día da el error 1027 ([Limits](https://developers.cloudflare.com/workers/platform/limits/)). [I] Hacer SSR de Next.js con 10 ms de CPU es justo. React Router y Astro son más livianos. [E] La doc de OpenNext todavía menciona el tope viejo de 3 MiB ([OpenNext](https://opennext.js.org/cloudflare)); manda la doc de Cloudflare. |
| ↳ Next.js vía OpenNext | — | [E] Soporta Next 16 y las últimas versiones menores de 14 y 15 con runtime Node, App/Pages Router, ISR y PPR. Todavía no soporta el Node Middleware de 15.2 ([OpenNext](https://opennext.js.org/cloudflare)) | — | — | [E] Para `next/image` hay que usar el binding de Cloudflare Images o un loader con `/cdn-cgi/image/`, y "can incur additional costs" ([OpenNext – Image](https://opennext.js.org/cloudflare/howtos/image)) |
| ↳ React Router / Astro / SvelteKit | — | [E] React Router tiene una plantilla de Cloudflare mantenida por Cloudflare. La versión actual de la doc es la **v8.4** ([React Router – Deploying](https://reactrouter.com/start/framework/deploying)) | — | — | [I] Si empiezas hoy, usa la versión actual (v8) en vez de fijarte en la v7 |
| **Netlify Free** | No encontré prohibición ([Pricing](https://www.netlify.com/pricing/)) | [E] 300 créditos al mes con tope fijo. Cada deploy de producción cuesta 15 créditos, 1 GB de ancho de banda 20, 10k requests 2 y 1 GB-h de cómputo 10 ([Pricing](https://www.netlify.com/pricing/), [Credit plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)) | No duerme, pero se **pausa** al agotar los créditos | [E] No ([Billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/)) | [E] Al agotar los créditos, **todos** los sitios muestran "Site not available" hasta el próximo ciclo ([Billing FAQ](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/billing-faq-for-credit-based-plans/)). [I] 20 deploys se comen todo el mes, y 15 GB de fotos también. |
| **Render Free** | No encontré prohibición, pero la doc advierte "Do not use them for production applications" ([Free](https://render.com/docs/free)) | [E] 750 horas de instancia al mes | [E] Sí. Duerme tras 15 min sin tráfico y tarda "about one minute" en despertar ([Free](https://render.com/docs/free)) | No encontrado | [E] La Postgres gratis **caduca a los 30 días** y tiene 1 GB ([Free](https://render.com/docs/free)). [I] Un minuto de arranque en frío arruina la vista previa de WhatsApp y Facebook. |
| **Railway** | No encontrado | [E] Trial: 5 USD una vez, válido 30 días. Después, plan Free con **1 USD/mes**, 0,5 GB de RAM y 0,5 GB de volumen por servicio ([Trial](https://docs.railway.com/reference/pricing/free-trial), [Plans](https://docs.railway.com/reference/pricing/plans)) | No encontrado | [E] No para empezar el trial | [I] 1 USD/mes no alcanza para una app Node más Postgres encendidas todo el mes |
| **Fly.io** | — | [E] No tiene capa gratis. El trial es de 2 h de máquina o 7 días ([Free trial](https://docs.fly.io/about/free-trial/)) | [E] Las máquinas del trial se paran a los 5 min | [E] **Sí**: "All organizations … require a credit card" ([Pricing](https://docs.fly.io/about/pricing/)) | Descartado por costo 0 |

## 2. Postgres (y D1)

| Servicio | ¿Uso comercial? | Límites | ¿Se pausa? / despertar | ¿Tarjeta? | Trampas |
|---|---|---|---|---|---|
| **Neon Free** | No encontré prohibición. Lo orientan a "Prototypes, side projects, and small teams" ([Pricing](https://neon.com/pricing)) | [E] 100 proyectos, 100 CU-h por proyecto al mes (≈400 h a 0,25 CU), 0,5 GB por proyecto, 5 GB de egress ([Plans](https://neon.com/docs/introduction/plans)) | [E] Escala a cero tras 5 min, no se puede desactivar, y reactiva "within a few hundred milliseconds" ([Scale to zero](https://neon.com/docs/introduction/scale-to-zero)) | [E] No ([Pricing](https://neon.com/pricing)) | [E] Si agotas los CU-h, el cómputo queda suspendido hasta el mes siguiente, sin borrar datos ([Plans](https://neon.com/docs/introduction/plans)). [I] 0,5 GB sobra para 500 piezas porque las fotos van fuera de la DB. |
| **Supabase Free** | No encontrado ([Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)) | [E] DB de 500 MB, 1 GB de Storage, 5 GB de egress más 5 GB cacheado, 50k MAU de Auth, 2 proyectos activos, archivos de hasta 50 MB ([Pricing](https://supabase.com/pricing)) | [E] **Se pausa tras 1 semana de inactividad.** Se restaura a mano con un clic en el dashboard, con un plazo de 1 año ([Pricing](https://supabase.com/pricing), [Upgrading](https://supabase.com/docs/guides/platform/upgrading)) | [E] No ([Blog pricing](https://supabase.com/blog/pricing)) | [E] Si pasas las cuotas, pueden pausar el proyecto o dejar la DB en solo lectura ([Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)). [E] Las transformaciones de imagen son **solo desde Pro** ([Image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)). [I] 1 GB de Storage queda justo para 4.500 fotos. |
| **Cloudflare D1** | Sí (plataforma Cloudflare) | [E] 5M filas leídas y 100k escritas por día, 5 GB en total ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)) | No | No | [E] **Es SQLite, no Postgres.** Al pasar el límite, las consultas dan error ([D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/)). Es válido con Drizzle, pero no cumple el requisito de usar Postgres. |
| **Prisma Postgres Free** | No encontrado | [E] 200.000 operaciones al mes, 500 MB, 50 bases de datos ([Pricing](https://www.prisma.io/pricing)) | No encontrado | [E] No: "Free forever. No credit card required" | [E] La página no dice qué pasa si superas las operaciones. [I] Cada consulta cuenta, y un catálogo con SSR sin caché puede gastar 200k al mes. |
| **Xata** | — | [E] La nube solo ofrece un trial de 14 días; después hay que pagar. La edición gratis es self-hosted ([Pricing](https://xata.io/pricing)) | — | Sin tarjeta en el trial | Descartado |
| **Nile** | No encontrado | [E] 1 GB, 50M "query tokens" al mes, y dice que la DB "never pauses" ([Pricing](https://www.thenile.dev/pricing)) | [E] No se pausa | No encontrado | [I] Está pensado para SaaS multi-tenant y es un proveedor más chico. Es innecesario aquí. |

**Postgres desde Workers.** [E] Hyperdrive está disponible en el plan Free con 100.000 consultas/día ([Hyperdrive pricing](https://developers.cloudflare.com/hyperdrive/platform/pricing/)). [I] Otra opción es el driver HTTP/WebSocket de Neon (`@neondatabase/serverless`) con Drizzle, que no necesita Hyperdrive.

## 3. Imágenes y almacenamiento

| Servicio | ¿Comercial? | Límites gratis | ¿Tarjeta? | Trampas |
|---|---|---|---|---|
| **Cloudflare R2** | Sí | [E] 10 GB-mes, 1M operaciones clase A y 10M clase B al mes. **Egress gratis.** Solo aplica a Standard storage ([R2 pricing](https://developers.cloudflare.com/r2/pricing/)) | **Sí.** [E] Activar R2 exige cargar un medio de pago aunque solo uses la capa gratis ([Comunidad Cloudflare](https://community.cloudflare.com/t/why-using-r2-free-tier-involves-giving-card-info/945179), [Billing policy](https://developers.cloudflare.com/billing/billing-policy/)) | [I] Si superas la capa gratis se cobra, no se corta. Con ~1,5 GB estás muy lejos del límite. |
| **Cloudflare Images** | Sí | [E] Free: 5.000 transformaciones **únicas** al mes. Pasado ese número, las nuevas dan el error `9422` y no hay cobro. **No incluye almacenamiento** en Free ([Images pricing](https://developers.cloudflare.com/images/pricing/)) | No para transformar [I] | [E] Hay que tener la zona (dominio) en Cloudflare y activar las transformaciones ([Transform images](https://developers.cloudflare.com/images/transform-images/)). [I] 4.500 fotos × 2–3 tamaños ≈ 9–13k transformaciones: se pasa de 5k en el mes del alta masiva. |
| **Supabase Storage** | ver arriba | [E] 1 GB y archivos de hasta 50 MB. **Transformaciones solo desde Pro** (5 USD por 1.000 imágenes de origen fuera de la cuota) ([Pricing](https://supabase.com/pricing), [Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)) | No | [I] Queda justo de espacio y además depende de un proyecto que se pausa |
| **Cloudinary Free** | [E] Su FAQ dice que el Free se puede usar "even in production" sin restricciones mientras no te pases de créditos ([FAQ Free](https://cloudinary.com/documentation/developer_onboarding_faq_free_plan)) | [E] 25 créditos. 1 crédito equivale a 1.000 transformaciones, 1 GB de almacenamiento o 1 GB de ancho de banda. Se miden en una ventana móvil de 30 días ([Pricing](https://cloudinary.com/pricing), [Credits](https://cloudinary.com/documentation/developer_onboarding_faq_credits)) | [E] No | [I] Para el alta de 4.500 fotos: ~1,5 créditos de almacenamiento + 9–13 de transformaciones + el ancho de banda. Entra en 25, pero sin mucho margen si crece el tráfico. |
| **ImageKit Free** | No encontrado ([Terms](https://imagekit.io/terms/)) | [E] 20 GB de ancho de banda al mes y 3 GB de almacenamiento ([Plans](https://imagekit.io/plans/)) | No encontrado | [E] Si excedes un límite, "the corresponding functionality will stop" ([How pricing works](https://imagekit.io/docs/how-pricing-works)) |
| **UploadThing Free** | No encontrado | [E] 2 GB y "unlimited uploads/downloads" ([Pricing](https://uploadthing.com/pricing)) | No encontrado | [I] No optimiza imágenes. Sirve solo como almacenamiento. |

## 4. Optimización de imágenes de Next.js: Vercel Hobby vs Cloudflare

- **Vercel Hobby.** [E] Incluye 5K transformaciones, 300K lecturas de caché y 100K escrituras al mes. Al superarlas, las imágenes nuevas devuelven **402**, se muestra el `alt` y no hay cobro. Las ya optimizadas siguen funcionando ([Image limits](https://vercel.com/docs/image-optimization/limits-and-pricing)). En todo caso, Hobby no admite uso comercial.
- **Cloudflare + OpenNext.** [E] Usa el binding de Cloudflare Images, sujeto a las mismas 5.000 transformaciones únicas al mes del plan Free y al error `9422` al pasarse ([OpenNext – Image](https://opennext.js.org/cloudflare/howtos/image), [Images pricing](https://developers.cloudflare.com/images/pricing/)).
- **[I] Conclusión.** Las dos opciones gratis topan en ~5k transformaciones al mes, y el alta del catálogo las supera. La salida a 0 USD es **pre-generar los tamaños al subir la foto** en el panel: redimensionar en el navegador (canvas/OffscreenCanvas o un códec WASM) a WebP en 2–3 anchos, guardar los derivados en R2 y servirlos tal cual con `<img srcset>` o `next/image unoptimized`. Así no hace falta ningún servicio de transformación.

## 5. Open Graph para WhatsApp y Facebook [I]

Los crawlers de WhatsApp y Facebook no ejecutan JavaScript. Por eso la ficha de cada pieza necesita SSR (o SSG/ISR) con `og:title`, `og:description` y `og:image` como URL absoluta. Conviene que `og:image` sea un derivado liviano (~1200×630 JPEG/WebP) ya generado en R2. Un host que duerme (Render, ~1 min) puede hacer que el crawler agote su tiempo de espera y la vista previa salga vacía. Workers y Vercel no tienen ese problema.

## 6. Dos combinaciones de 0 USD/mes

### A. React Router (v8, modo framework) + Cloudflare Workers + Neon + Drizzle + R2 con tamaños pre-generados — **recomendada**

- **Pros.** El uso comercial está permitido [E]. Los assets estáticos son ilimitados y el egress de R2 es gratis [E]. No hay arranques en frío del host [I], y Neon despierta en cientos de ms [E]. Con Drizzle y el driver serverless de Neon (o Hyperdrive) se habla con Postgres de verdad. El SSR es liviano y cómodo con los 10 ms de CPU [I]. Todo el hosting y el almacenamiento quedan en un solo proveedor.
- **Contras.** R2 pide tarjeta registrada aunque no cobre [E]. El límite de 10 ms de CPU obliga a mantener el SSR simple [E/I]. La auth del panel hay que armarla (por ejemplo, Better Auth sobre Postgres) [I]. Si se agotan los 100 CU-h de Neon, la DB se suspende hasta fin de mes [E] (improbable con tráfico bajo y escala a cero [I]).
- **Variante sin tarjeta:** cambiar R2 por Cloudinary Free, subiendo los tamaños ya generados para gastar solo almacenamiento y ancho de banda [I].

### B. Next.js (App Router) + Cloudflare Workers vía OpenNext + Supabase (Postgres + Auth) + Drizzle/Prisma + Cloudinary Free

- **Pros.** Next.js tiene el ecosistema más grande. Supabase da Auth lista para los 2 usuarios. Nadie en esta pila exige tarjeta [E: Supabase, Cloudinary]. Cloudinary transforma y entrega por CDN.
- **Contras.** **Supabase pausa el proyecto tras 1 semana sin actividad** y hay que restaurarlo a mano [E]. Con tráfico incierto, la tienda puede "caerse" sin aviso [I]. Se podría evitar con un cron de Workers que haga un ping, pero eso bordea el espíritu de la capa gratis [I]. El SSR de Next es más pesado frente al límite de 10 ms de CPU [I]. OpenNext añade una capa de adaptación y todavía no soporta el Node Middleware [E]. Los créditos de Cloudinary quedan justos con 9–13k transformaciones iniciales [I]. Vercel no es opción porque es comercial [E].

### Recomendación

**A.** Es la única combinación donde todas las piezas permiten uso comercial sin ambigüedad, nada se pausa de forma que tumbe el sitio (Neon escala a cero pero despierta en milisegundos) y no depende de una cuota de transformaciones que el propio alta del catálogo supera. Para un desarrollador solo, Drizzle con Neon en Workers es una pila chica y tipada de punta a punta, y el SSR con Open Graph sale natural con los `meta` de React Router. Si no se quiere registrar tarjeta, usar la variante con Cloudinary.

---

## Resumen

1. **Vercel Hobby prohíbe el uso comercial** (vender productos cuenta), así que queda descartado aunque técnicamente alcance.
2. **Cloudflare Workers Free** permite uso comercial: 100k requests/día, 10 ms de CPU por request (el I/O no cuenta), assets estáticos ilimitados y, desde el 2026-09-04, Workers de hasta 64 MiB sin tope comprimido.
3. **Netlify Free** tiene 300 créditos al mes. Al agotarlos, pausa **todos** los sitios hasta el siguiente ciclo, y cada deploy cuesta 15 créditos.
4. **Render** duerme a los 15 min (~1 min para despertar) y su Postgres gratis caduca a los 30 días. **Railway** da 1 USD/mes. **Fly.io** exige tarjeta y no tiene capa gratis.
5. **Neon Free**: 0,5 GB, 100 CU-h/mes, escala a cero y despierta en cientos de ms, sin tarjeta. Es la mejor opción de Postgres gratis aquí.
6. **Supabase Free** se pausa tras 1 semana de inactividad (restauración manual) y no incluye transformaciones de imagen (solo Pro).
7. **D1** es SQLite, no Postgres. **Xata** ya no tiene nube gratis (trial de 14 días). **Prisma Postgres** tiene 200k operaciones al mes.
8. **R2**: 10 GB y egress gratis, pero pide tarjeta para activarse.
9. **Cloudflare Images y Vercel** tienen el mismo techo de ~5k transformaciones al mes; al pasarlo dan error (9422 o 402), no cobran.
10. El catálogo (~4.500 fotos × 2–3 tamaños) supera ese techo, así que conviene **pre-generar los tamaños al subir** y servirlos estáticos.
11. **Cloudinary Free** (25 créditos, sin tarjeta, apto para producción) es la alternativa sin tarjeta a R2.
12. Open Graph para WhatsApp y Facebook exige SSR y un host sin arranques en frío largos.
13. **Recomendación:** React Router + Workers + Neon + Drizzle + R2 con tamaños pre-generados.
14. **Plan B:** Next.js vía OpenNext + Supabase + Cloudinary, con el riesgo de la pausa semanal de Supabase.
