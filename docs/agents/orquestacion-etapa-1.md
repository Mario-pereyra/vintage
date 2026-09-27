# Plan de orquestación: Etapa 1

Este plan está aprobado. El spec es el issue #1, los tickets van del #2 al #13 y la dirección visual es el #14.

## Carriles

- **A, subagentes:** implementan los tickets en worktrees aislados.
- **D, diseño:** se hace con el usuario en una sesión aparte, con `/impeccable` en Opus 5.5 y esfuerzo medio. `/ui-ux-pro-max` sirve solo para consultar referencias.
- **H, pasos humanos:** credenciales (`/wizard`), aprobaciones de diseño y verificación física (PWA en Android, cámara, vista previa en WhatsApp, Google OAuth real).

## Olas

| Ola | Tickets | Notas |
|---|---|---|
| 0 | — | Credenciales con `/wizard` (Cloudflare Workers y R2, Neon en São Paulo, Google OAuth, número de WhatsApp). Crear las definiciones de agentes. Agregar el login de desarrollo como criterio del #3. |
| 1 | #2 | Además: CI en GitHub Actions y vistas previas en Workers. |
| 2 | #3 | Incluye un **login de desarrollo** (sesión de prueba solo en local y en las vistas previas, desactivada en producción por variable de entorno) para que Playwright recorra `/admin`. |
| — | **Puerta de diseño** | El usuario aprueba `DESIGN.md` y los componentes base, y `AGENTS.md` apunta a `DESIGN.md`. Recién ahí se construyen pantallas importantes. |
| 3 | #4 | Va solo, porque define el esquema de Pieza. |
| 4a | #5, #7, #8, #9 | En paralelo. |
| 4b | #6, #12, #10 | Después de la 4a, porque comparten el formulario de pieza y la acción de publicar. El #10 espera al #9. |
| 5 | #11, #13 | |

Tope: **4 tickets a la vez**. Una ola empieza solo con `main` en verde y los tickets que la bloquean cerrados.

## Roles, modelos y esfuerzo

| Rol | Definición en `.claude/agents/` | Modelo | Esfuerzo |
|---|---|---|---|
| Orquestador | (sesión principal) | Opus 5.5 | medio |
| Diseño | (sesión con el usuario) | Opus 5.5 | medio; alto solo en la revisión final contra el boceto |
| Implementador del núcleo: #2, #3, #4, #9, #10, #11 | `implementador-nucleo` | Opus 5.5 | medio |
| Implementador estándar: #5, #6, #7, #8, #12, #13 | `implementador` | Sonnet 5 | medio |
| Verificador | `verificador` | Sonnet 5 | bajo; medio al re-verificar |
| Rebase y conflictos de migraciones | `implementador` | Sonnet 5 | medio |
| Búsquedas | Explore | Haiku 4.5 | — |

## Protocolo por ticket

1. **Implementador:** trabaja en su propio worktree, en la rama `ticket/<N>`. Corre `/implement #N` (TDD sobre el módulo de dominio, luego la interfaz con los componentes base de `DESIGN.md`, luego `/code-review`). Abre un PR con "Closes #N" y entrega un informe breve.
2. **Verificador:** trabaja con contexto limpio y no puede editar código. Lee el ticket, levanta la app, recorre cada criterio de aceptación con `playwright-cli`, toma capturas en celular (390 px) y en escritorio, y comenta en el PR ✅ o ❌ por criterio.
3. **Si hay ❌:** el implementador corrige y el verificador repite, como máximo 2 vueltas. Si sigue fallando, se escala al usuario.
4. **Merge:** lo hace el usuario, después de la verificación y con el CI en verde, uno por vez. Si dos PR traen migraciones, el segundo se rebasa y regenera la suya.

## Reglas de git

- Se usa la identidad de git del usuario.
- **No** se agrega `Co-Authored-By` en los commits ni el pie "Generated with Claude Code" en los PR (ver `AGENTS.md`).
- El primer commit ya se reescribió sin `Co-Authored-By` y se subió con force push.
- El `~/.gitignore_global` del usuario ignora `AGENTS.md`: si se crea uno nuevo, hay que agregarlo con `git add -f`.

## Pruebas

- El único punto de prueba automática en el CI es el módulo de dominio (Vitest con PGlite).
- Playwright se usa para verificar cada PR, no como suite end-to-end.

## Estado (2026-09-26)

**Ola 0: terminada.**
- Las definiciones de agentes están en `.claude/agents/`: `implementador-nucleo`, `implementador` y `verificador`. Se cargan al iniciar una sesión. Si una sesión no las ve, lanza `general-purpose` con el modelo del rol y pídele que lea y siga su archivo de definición.
- El #3 tiene el criterio del login de desarrollo. El #2 tiene los criterios de CI y de vistas previas.
- Las credenciales están cargadas y probadas, así que no hay que repetir el wizard:
  - GitHub secrets: `DATABASE_URL`, `DIRECT_URL` (rama `main` de Neon, producción), `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
  - GitHub vars: `APP_URL=https://vintage.marioelprogamer710.workers.dev`, `R2_BUCKET=vintage-fotos`, `R2_PUBLIC_URL` y `WHATSAPP_NUMBER`.
  - Neon: el proyecto está en `aws-sa-east-1`, con la rama `main` para producción y la rama `dev` para local.
  - R2: el bucket es `vintage-fotos`, con URL pública r2.dev.
- El `.env` está en la raíz del repo principal y apunta a la rama `dev` de Neon. Los worktrees no lo tienen: el agente que necesite correr la app lo copia y lo borra al terminar, y nunca lo commitea.
- Google OAuth está en modo prueba, con Mario e Ingrid como usuarios de prueba. Los orígenes y redirects registrados son `http://localhost:5173` y la `APP_URL`, con el path `/api/auth/callback/google`. Las vistas previas no pueden usar Google, así que entran con el login de desarrollo.
- La marca es **Vintage Secret's** (ver el commit aa9f911).

**Ola 1 (#2): PR #15 abierto, CI en verde y rebasado sobre `main`.**
- La primera verificación dio 5 ✅, 0 ❌ y 3 ⏸️, estos por falta de credenciales. Hay una re-verificación en curso con Neon `dev`, y su resultado queda en los comentarios del PR.
- Después del merge, que hace el usuario, hay que confirmar que el primer despliegue desde `main` funcione. Recién entonces se activan las vistas previas.
- Riesgo abierto: las vistas previas usan `secrets.DATABASE_URL`, que es la base de producción. Las opciones son usar la rama `dev` (secrets `DEV_DATABASE_URL` y `DEV_DIRECT_URL`) o una rama por PR con `neonctl` (`NEON_API_KEY`). Decide el usuario.

**Próximos pasos**
1. Cuando se mergee el #2, avisar al usuario para que la sesión de diseño pase los tokens y componentes a la app.
2. Lanzar la ola 2 (#3) con `implementador-nucleo`. La interfaz es sobria y provisional, o usa los componentes base si ya se pasaron. La marca es "Vintage Secret's".
3. La puerta de diseño sigue cerrada hasta que el usuario apruebe `DESIGN.md` y los componentes base.

## Cómo retomar

En una sesión nueva, di: "Actúa como orquestador según `docs/agents/orquestacion-etapa-1.md` y continúa desde la sección Estado". Antes de lanzar una ola, el orquestador revisa `gh pr list`, `gh issue list` y el CI de `main`.
