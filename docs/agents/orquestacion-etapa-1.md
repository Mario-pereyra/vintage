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
- Pendiente: reescribir el primer commit, que tiene `Co-Authored-By`, y hacer force push. El usuario ya lo aprobó.

## Pruebas

- El único punto de prueba automática en el CI es el módulo de dominio (Vitest con PGlite).
- Playwright se usa para verificar cada PR, no como suite end-to-end.
