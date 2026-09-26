# Vintage

Catálogo público de carteras de segunda mano y panel de inventario. Vocabulario en `CONTEXT.md`, decisiones en `docs/adr/`.

Stack (ADR 0005): React Router v8 (modo framework) en Cloudflare Workers, Postgres en Neon con Prisma (adaptador serverless), fotos en R2 y pruebas del dominio con Vitest sobre PGlite.

## Estructura

| Carpeta | Qué hay |
|---|---|
| `app/dominio/` | **Módulo de dominio**: toda la lógica del negocio y el único seam de prueba. `crearDominio(prisma)` devuelve las operaciones. |
| `app/dominio/pruebas/` | `crearBaseDePrueba()`: Postgres en memoria (PGlite) con las migraciones reales y el dominio conectado. |
| `app/routes/` | Rutas de React Router. Los loaders y actions son delgados: validan la entrada, llaman al dominio y renderizan. |
| `app/componentes/` | Componentes base de la interfaz. |
| `app/servidor/` | Código solo de servidor: cliente de Prisma para Neon y el contexto que expone el dominio a los loaders. |
| `workers/app.ts` | Entrada del Worker: arma el dominio de cada request y se lo pasa a React Router. |
| `prisma/` | Esquema y migraciones. Las mismas migraciones corren en las pruebas y en producción. |

## Requisitos

- Node 22.22 o superior (el CI usa Node 24).
- Para correr la app en local: una base de Neon (idealmente una rama de desarrollo). Las pruebas no necesitan ninguna base.

## Primeros pasos

```sh
npm install            # también genera el cliente de Prisma
cp .env.example .env   # y completa los valores (ver abajo)
npm run db:deploy      # aplica las migraciones a la base de DIRECT_URL
npm run dev            # http://localhost:5173
```

El dev server corre siempre en `http://localhost:5173` (es la URL registrada en Google OAuth); si el puerto está ocupado, falla en vez de cambiarlo.

## Variables de entorno

Todas están documentadas en `.env.example`. En local basta con un `.env`: lo leen Prisma, Wrangler y el runtime local del Worker.

| Variable | Tipo | Dónde vive en producción |
|---|---|---|
| `DATABASE_URL` | secreto | Secreto de GitHub → secreto del Worker |
| `DIRECT_URL` | secreto | Secreto de GitHub (solo migraciones en CI) |
| `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS` | secreto | Secreto de GitHub → secreto del Worker |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | secreto | Secreto de GitHub (Wrangler en CI) |
| `APP_URL` | variable | Variable de GitHub → `BETTER_AUTH_URL` del Worker |
| `WHATSAPP_NUMBER`, `R2_PUBLIC_URL` | variable | Variable de GitHub → var del Worker |
| `R2_BUCKET` | variable | Variable de GitHub (`vintage-fotos`); el binding `FOTOS` está en `wrangler.jsonc` |

Los secretos de runtime están declarados en `wrangler.jsonc` (`secrets.required`): Wrangler avisa en local si falta alguno y rechaza un despliegue sin ellos.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Dev server (Vite + workerd) en el puerto 5173. |
| `npm test` | Pruebas del dominio contra PGlite. |
| `npm run typecheck` | Genera tipos (Wrangler y React Router) y corre `tsc`. |
| `npm run build` | Build de producción. |
| `npm run db:migrate -- --name <nombre>` | Crea una migración nueva a partir del esquema (necesita `DIRECT_URL`; usa una rama de Neon de desarrollo). |
| `npm run db:deploy` | Aplica las migraciones pendientes a la base de `DIRECT_URL`. |
| `npm run deploy` | Build y despliegue manual a Workers (ver abajo). |

## Pruebas

Las pruebas llaman a las operaciones públicas del dominio y verifican resultados observables; no verifican SQL ni llamadas internas.

```ts
const base = await crearBaseDePrueba(); // base limpia con las migraciones reales
const catalogo = await base.dominio.listarCatalogo();
await base.cerrar();
```

Cada llamada a `crearBaseDePrueba()` clona una base ya migrada, así que cada prueba arranca desde cero sin repetir las migraciones. Las operaciones que dependen de la hora reciben la hora como parámetro.

## Despliegue

### Automático (GitHub Actions, `.github/workflows/ci.yml`)

- **Cada PR y cada push a `main`**: typecheck, pruebas y build. No necesita secretos.
- **Cada PR**: sube una versión de preview del Worker con `wrangler versions upload --preview-alias pr-<N>` (producción no cambia) y comenta la URL en el PR. Si `APP_URL` es `https://vintage.<sub>.workers.dev`, la preview recibe `BETTER_AUTH_URL=https://pr-<N>-vintage.<sub>.workers.dev`. La preview usa la base de producción y no aplica las migraciones del PR.
- **Push a `main`**: verifica que el bucket `R2_BUCKET` exista y coincida con `wrangler.jsonc`, hace el build, aplica `prisma migrate deploy` con `DIRECT_URL` y despliega con `wrangler deploy --secrets-file`, que sube los secretos de runtime en la misma versión.

Si falta algún secreto o las variables `APP_URL` o `R2_BUCKET`, los jobs de despliegue se saltan con un aviso en lugar de fallar. La primera preview aparece después del primer despliegue a producción.

### Manual

Con el `.env` completo y `CLOUDFLARE_API_TOKEN` en el entorno (o tras `npx wrangler login`):

```sh
npm run db:deploy
npm run deploy -- --secrets-file ../secretos-vintage.json
```

`secretos-vintage.json` es un JSON con los cinco secretos de runtime (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`); guárdalo fuera del repo. Si los secretos ya están cargados en el Worker, basta con `npm run deploy`. Las vars de `wrangler.jsonc` traen valores de desarrollo; en un despliegue manual pásalas con `--var BETTER_AUTH_URL:<APP_URL> --var WHATSAPP_NUMBER:<número> --var R2_PUBLIC_URL:<url>` (el CI lo hace solo).

Antes del primer despliegue tiene que existir el bucket de R2 `vintage-fotos` (`npx wrangler r2 bucket create vintage-fotos`).
