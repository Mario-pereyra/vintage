# Plan de orquestación: Etapa 1

Este plan está aprobado. El spec es el issue #1, los tickets de funcionalidad van del #2 al #13, la aplicación del diseño es el #16 y el despliegue es el #17. El #14 (dirección visual) queda resuelto por `DESIGN.md` y la maqueta; lo que falta se revisa en el #19.

## Decisiones del 2026-09-26

Estas decisiones del usuario mandan sobre cualquier versión anterior de este plan.

1. **Una sola terminal.** Ya no hay una sesión aparte de diseño. El diseño entra a la app como un ticket más (#16), hecho por el rol `disenador-ui`.
2. **Siete roles** en `.claude/agents/` (ver la tabla de roles). Todos trabajan en un worktree, con la identidad de git del usuario, y leen `DESIGN.md` antes de tocar la interfaz. Todo lo visual va con Opus y esfuerzo medio, sin excepción.
3. **Cada ticket con interfaz tiene dos fases en la misma rama:** primero el dominio con TDD y después `disenador-ui`. Luego corren en paralelo `verificador` y `revisor-diseno`. Tickets del núcleo: #3, #4, #9, #10, #11 y el despliegue (#17). Tickets estándar: #5, #6, #7, #8, #12 y #13.
4. **Escalada.** Si `dominio` falla 2 veces, el ticket pasa a `dominio-nucleo`. Si este falla 2 veces, pasa a Fable 5.1 con esfuerzo alto. Si también falla, se abre un issue `ready-for-human` y se sigue con lo que no dependa de él.
5. **Merge autónomo.** El orquestador mergea sin preguntar cuando se cumplen las cuatro condiciones: CI en verde, verificador ✅, `revisor-diseno` sin fallas materiales y `/code-review` sin hallazgos graves.
6. **Tickets nuevos:** #16 "Aplicar DESIGN.md a la app" (bloqueado por #2, bloquea del #4 al #13), #17 "Despliegue a producción" (bloqueado por todos), #18 "Verificación humana" y #19 "Ronda de ajustes visuales" (los dos `ready-for-human`, bloqueados por #17).

**Meta:** producción en workers.dev con Neon y el login real. El orquestador trabaja con `/loop` por olas, actualiza la sección Estado al cerrar cada ola (para poder compactar el contexto) y lleva como máximo 4 tickets en paralelo hasta desplegar.

## Carriles

- **A, subagentes:** implementan, diseñan, verifican e integran los tickets en worktrees aislados.
- **H, pasos humanos:** verificación física y de producción (#18) y ronda de ajustes visuales con la dueña (#19). Las credenciales ya están cargadas.

## Olas

| Ola | Tickets | Notas |
|---|---|---|
| 0 | — | Terminada: credenciales y definiciones de agentes. |
| 1 | #2 | Terminada: esqueleto, CI y vistas previas. |
| 2 | #3, #16 | En paralelo. El #3 hace el dominio (auth, login de desarrollo, PWA) y luego su interfaz. El #16 es solo diseño. El que se mergee segundo se rebasa. |
| 3 | #4 | Va solo, porque define el esquema de Pieza. |
| 4a | #5, #7, #8, #9 | En paralelo. |
| 4b | #6, #12, #10 | Después de la 4a, porque comparten el formulario de pieza y la acción de publicar. El #10 espera al #9. |
| 5 | #11, #13 | |
| 6 | #17 | Despliegue a producción. Después, el orquestador deja listos #18 y #19 para el usuario. |

Tope: **4 tickets a la vez**. Una ola empieza solo con `main` en verde y los tickets que la bloquean cerrados.

## Roles, modelos y esfuerzo

| Rol | Definición en `.claude/agents/` | Modelo | Esfuerzo | Edita |
|---|---|---|---|---|
| Orquestador | (sesión principal) | Opus 5.5 | medio | solo el plan |
| Dominio del núcleo: #3, #4, #9, #10, #11, #17 y escaladas | `dominio-nucleo` | Opus | medio | sí |
| Dominio estándar: #5, #6, #7, #8, #12, #13 | `dominio` | Sonnet | medio | sí |
| Interfaz (fase 2 y #16) | `disenador-ui` | Opus | medio | sí |
| Revisión de terminación visual con `/impeccable` contra `DESIGN.md` | `revisor-diseno` | Opus | medio | no |
| Verificación de criterios funcionales con `playwright-cli` | `verificador` | Sonnet | bajo | no |
| Rebases, migraciones y CI mecánico | `integrador` | Sonnet | medio | sí |
| Bugs difíciles con `/diagnosing-bugs` | `diagnostico` | Opus | alto | sí |
| Última escalada | `general-purpose` con Fable 5.1, que lee y sigue `dominio-nucleo.md` | Fable 5.1 | alto | sí |
| `/code-review` del PR | `general-purpose` con Sonnet | Sonnet | — | no |

Si una sesión no ve las definiciones, lanza `general-purpose` con el modelo del rol y pídele que lea y siga su archivo.

## Protocolo por ticket

1. **Fase 1, dominio** (`dominio` o `dominio-nucleo`): rama `ticket/N` desde `main`, TDD sobre el módulo de dominio y luego la capa delgada (rutas, loaders, actions) con una interfaz mínima. Push y PR en borrador con `Closes #N`. Si el ticket no tiene interfaz, el PR sale listo y se salta la fase 2.
2. **Fase 2, interfaz** (`disenador-ui`): toma la misma rama, construye las pantallas con `/impeccable` según `DESIGN.md`, hace push y marca el PR listo.
3. **Revisión en paralelo:** `verificador` (criterios funcionales, ✅/❌/⏸️), `revisor-diseno` (fallas materiales o menores) y `/code-review` contra `main`. Cada uno comenta en el PR.
4. **Correcciones:** los ❌ funcionales y los hallazgos graves de código vuelven al rol de dominio del ticket; las fallas visuales materiales vuelven a `disenador-ui`. Como máximo 2 vueltas por rol; después se aplica la escalada. Los hallazgos visuales menores se anotan en el #19. Los ⏸️ se suman al #18.
5. **Merge** (orquestador, sin preguntar): con las cuatro condiciones cumplidas, `gh pr merge --squash`, uno por vez. Si el siguiente PR queda desactualizado o sus migraciones chocan, lo rebasa el `integrador` y se vuelve a esperar el CI.

## Reglas de git

- Se usa la identidad de git del usuario.
- **No** se agrega `Co-Authored-By` en los commits ni el pie "Generated with Claude Code" en los PR (ver `AGENTS.md`).
- El `~/.gitignore_global` del usuario ignora `AGENTS.md`: si se crea uno nuevo, hay que agregarlo con `git add -f`.

## Pruebas

- El único punto de prueba automática en el CI es el módulo de dominio (Vitest con PGlite).
- Playwright se usa para verificar y revisar cada PR, no como suite end-to-end.

## Estado (2026-09-26)

**Ola 0: terminada.**
- Las definiciones de agentes se reemplazaron por los siete roles de la tabla (decisión 2).
- El #3 tiene el criterio del login de desarrollo. El #2 tiene los criterios de CI y de vistas previas.
- Las credenciales están cargadas y probadas, así que no hay que repetir el wizard:
  - GitHub secrets: `DATABASE_URL`, `DIRECT_URL` (rama `main` de Neon, producción), `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`, `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
  - GitHub vars: `APP_URL=https://vintage.marioelprogamer710.workers.dev`, `R2_BUCKET=vintage-fotos`, `R2_PUBLIC_URL` y `WHATSAPP_NUMBER`.
  - Neon: el proyecto está en `aws-sa-east-1`, con la rama `main` para producción y la rama `dev` para local.
  - R2: el bucket es `vintage-fotos`, con URL pública r2.dev.
- El `.env` está en la raíz del repo principal y apunta a la rama `dev` de Neon. Los worktrees no lo tienen: el agente que necesite correr la app lo copia y lo borra al terminar, y nunca lo commitea.
- Google OAuth está en modo prueba, con Mario e Ingrid como usuarios de prueba. Los orígenes y redirects registrados son `http://localhost:5173` y la `APP_URL`, con el path `/api/auth/callback/google`. Las vistas previas no pueden usar Google, así que entran con el login de desarrollo.
- La marca es **Vintage Secret's** (ver el commit aa9f911).

**Ola 1 (#2): terminada.**
- El PR #15 se mergeó con squash (edacf2c) y el #2 quedó cerrado. La verificación dio 7 ✅ y 0 ❌.
- El primer despliegue desde `main` funcionó: https://vintage.marioelprogamer710.workers.dev responde 200 con "Pronto nuevas carteras", renderizado en el servidor contra Neon `main`.
- Las vistas previas por PR usan la rama `dev` de Neon (secrets `DEV_DATABASE_URL` y `DEV_DIRECT_URL`) y aplican ahí las migraciones del PR. Producción usa `DATABASE_URL` y `DIRECT_URL`. Las previews recién se ven con el próximo PR, porque el Worker ya existe.

**Reorganización (decisiones del 2026-09-26): terminada.**
- Se crearon #16, #17, #18 y #19, con sus dependencias nativas en GitHub. Del #4 al #13 quedaron bloqueados por el #16. El #14 tiene un comentario que lo remite al #16 y al #19.

**Próximos pasos**
- Ola 2: `dominio-nucleo` en el #3 y `disenador-ui` en el #16, en paralelo.

## Cómo retomar

En una sesión nueva, di: "Actúa como orquestador según `docs/agents/orquestacion-etapa-1.md` y continúa desde la sección Estado". Antes de lanzar una ola, el orquestador revisa `gh pr list`, `gh issue list` y el CI de `main`.
