# Stack serverless gratuito: React Router en Cloudflare Workers + Neon + R2

Con presupuesto de 0 USD/mes, uso comercial y un solo desarrollador que mantiene, elegimos una única app full-stack (catálogo público + panel `/admin`) en **React Router v8 (modo framework) sobre Cloudflare Workers**, **Postgres en Neon** (región São Paulo) vía **Prisma**, y fotos en **Cloudflare R2**. Login de operadoras con **Better Auth + Google** y lista de correos permitidos, sin registro público. El panel es una **PWA** responsive instalable, no una app nativa. Ver `docs/research/infraestructura-gratuita-2026.md` y `docs/research/vps-y-pagos-desde-bolivia-2026.md`.

## Considered Options

- **Next.js en Vercel**: descartado; Vercel Hobby prohíbe uso comercial.
- **Next.js en Cloudflare vía OpenNext**: adaptador de terceros y SSR más justo con el límite de CPU del plan gratuito.
- **VPS (Hostinger Brasil, Vultr Santiago, Contabo, Oracle Always Free)**: cuesta 5–12 USD/mes (Oracle es gratis pero puede reclamar la instancia), exige operar el servidor y un corte de pagos internacionales desde Bolivia (como entre 2023 y 2026) tumbaría la tienda. Migrar después es mover la misma base Postgres, no reescribir la app.
- **Supabase**: su plan gratuito se pausa tras una semana sin actividad.
- **App nativa Android**: un segundo código y publicación en Play Store para un solo mantenedor; la PWA cubre ícono, cámara y sincronización.

## Consequences

- Workers tiene ~10 ms de CPU por request en el plan gratuito: **las fotos se redimensionan en el navegador al subirlas** (miniatura, catálogo, detalle) y se sirven tal cual desde R2; no hay transformación de imágenes al vuelo.
- Sin modo offline: toda carga requiere conexión y va directo a la base de datos, que es la única fuente de verdad.
