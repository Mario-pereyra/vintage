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

## Estado (2026-09-27)

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

**Ola 2 (#16 y #3): terminada.**
- #16 → PR #20, squash b71e220. Una vuelta de corrección por 2 graves del code-review (selector de estado de la maqueta portado y wordmark ausente en el panel). Criterio aceptado: en las pantallas internas del panel el wordmark va en el `<title>`, porque la barra muestra el botón volver.
- #3 → PR #21, squash 1896d3b. Verificador 11 ✅ y 2 ⏸️ (login real con Google e instalación de la PWA, anotados en el #18). El diseño y el code-review salieron sin fallas materiales ni graves.
- Componentes del sistema en `app/componentes/` y muestrario en `/sistema` (solo en desarrollo). Los umbrales de tamaño están en `app/configuracion/tienda.ts`. Las pantallas de `/admin` definen su título con `export const handle = { titulo }`.
- Los hallazgos menores de diseño se van anotando en el #19.
- **Lección operativa:** los revisores en paralelo no deben tomar la rama con `gh pr checkout`, porque la bloquean para los demás worktrees. Tienen que usar `git fetch origin && git checkout --detach origin/ticket/N`.

**Ola 3 (#4): terminada.**
- #4 → PR #22, squash 3d5ca42. Una vuelta de corrección por un grave del code-review: `precioCentavos` no tenía tope y un valor enorme daba 500. Ahora el tope es de Bs 100.000.
- Verificador 10 ✅. El diseño salió sin fallas materiales y con seis desvíos aceptados; los menores están en el #19, y la nota sobre las tomas tocables, en el #5.
- Decisiones del modelo: una pieza En preparación admite datos incompletos. Para publicar hacen falta nombre, tipo, color, material, las tres medidas y el precio. El código es correlativo, sale de una secuencia de Postgres y el prefijo está en `configuracionTienda.prefijoDeCodigo`. La URL pública es `/carteras/<slug>-<sufijo>` y redirige si cambia el nombre.
- Pendiente para la dueña: los valores iniciales de las listas (tipos, colores y materiales), que están en la migración.
- **Lecciones operativas:** el `.env` apunta a Neon `dev`, así que los agentes pueden aplicar ahí sus migraciones. Cada agente usa su propia sesión de `playwright-cli`. En Neon `dev` quedan piezas de prueba.

**Ola 4a (#5, #7, #8 y #9): terminada.**
- #7 → PR #23, de535c3. Un grave: parámetros de URL sin tope que tiraban el catálogo público.
- #9 → PR #24, 64302e3. El vencimiento se calcula al leer en lugar de usar un Cron Trigger, por el costo de cómputo en Neon; es una decisión del orquestador que quedó comentada en el PR. Contador de vencidas: con 1 se avisa, con 2 se exige pago previo y con 3 se rechaza.
- #5 → PR #25, 0f6b923. Tres graves de seguridad en la subida de fotos: un tipo inválido borraba todas las fotos, la clave de R2 no se validaba y faltaban topes. Además, una falla material: los errores salían en inglés. El catálogo ya muestra la foto de portada.
- #8 → PR #26, 3498ad4. Dos graves: la apertura no era atómica y la cantidad de unidades no tenía tope. La migración se renombró a `20260927050000_...` para que quede después de las de `main`, y su registro se actualizó en Neon `dev`.
- #10 se adelantó (PR #27, `dominio-nucleo` + `disenador-ui`) porque sus bloqueos ya estaban cerrados.
- **Patrón recurrente:** los enteros y montos sin tope aparecen una y otra vez como grave. Hay que pedir los topes desde el prompt de dominio.
- **Lecciones operativas:**
  - El PR que se mergea segundo casi siempre necesita al `integrador`, así que conviene rebasar una sola vez, después del merge anterior.
  - Las vistas previas `pr-N-vintage…workers.dev` usan R2 real (el mismo bucket que producción) y Neon `dev`. Ahí se prueban las fotos.
  - Neon `dev` está lleno de datos de prueba.
- ⏸️ acumulados en #18 y menores de diseño en #19.

**Olas 4b y 5 (#10, #6, #12, #11 y #13): terminadas.**
- #10 → PR #27, 85713e7.
- #6 → PR #29, 5bf925d. Hubo una falla material de diseño: con "Mostrar" apagado, el valor quedaba al 55 % de opacidad y no cumplía WCAG AA. En la misma vuelta se sumaron dos cambios: "Sin marca" ya no se publica y los saltos de línea se conservan.
- #12 → PR #28, 5aa18b3. Hubo dos graves: el precio publicado se podía cambiar desde la edición sin dejar historial, y también se podía cambiar en piezas Vendidas o Retiradas, lo que reescribía la venta. Ahora el cambio solo se permite en Disponible o Reservada, con un `updateMany` atómico condicionado por estado. La migración se renombró a `20260927130000_...`.
- #11 → PR #30, 9fd3265. El build falló en CI porque `rentabilidad.ts` importaba `Prisma` como valor y eso metía el cliente y su wasm en el bundle del navegador. Ahora usa un `$queryRaw` fijo con parámetros NULL. La prueba de guarda `app/dominio/sin-cliente-de-prisma.test.ts` evita que vuelva a pasar. Hubo además una falla material: frases en Martian Mono.
- #13 → PR #31, e184041. El filtro por drop se agregó después del merge del #12. La búsqueda por Ref. compara solo dígitos.
- **Lecciones operativas:**
  - Las pruebas con PGlite dan timeouts cuando hay muchos agentes en paralelo. `hookTimeout` subió a 60 s; si siguen fallando, correr con `npm test -- --no-file-parallelism`. El CI es la fuente de verdad.
  - Con cada rebase, `app/app.css` se enreda porque las reglas son repetitivas. Lo más seguro es reconstruirlo como main + el bloque del ticket y comprobar que las llaves queden balanceadas.
  - El `.env` raíz no trae `DEV_LOGIN`. Los agentes que necesitan el login de desarrollo lo agregan a su copia.
  - Después de una corrección no hace falta repetir las tres revisiones: basta con el revisor que la encontró y una confirmación rápida del resto.

**Ola 6 (#17): terminada. La Etapa 1 está en producción.**
- #17 está cerrado, sin cambios de código ni de configuración. Los 8 criterios pasaron.
  - Deploy de `main` en verde, con las 9 migraciones aplicadas en Neon `main`.
  - Secretos de producción cargados. `DEV_LOGIN` está vacío y `/ingresar/desarrollo` responde 404.
  - `/admin` redirige a `/ingresar`, y Google recibe el `redirect_uri` correcto.
  - El catálogo y "Ver vendidas" (`/?vendidas=1`) responden 200.
  - La ficha y el Open Graph se verificaron en la preview, porque producción todavía no tiene piezas.
  - Informe con capturas: https://github.com/Mario-pereyra/vintage/issues/17#issuecomment-5853498536
- #18 tiene los pasos humanos: login real con Google, primera pieza con fotos y vista previa al compartir, revisar las listas iniciales y sacar la app de OAuth del modo de prueba.
- #19 tiene las capturas de las 28 pantallas a 390 y 1280 px, más el índice de menores por pantalla: https://github.com/Mario-pereyra/vintage/issues/19#issuecomment-5853649669

**Próximos pasos (humanos)**
- La dueña hace los pasos del #18 y marca en el #19 los ajustes visuales que quiere. La ronda de ajustes se lanza con `disenador-ui`, más `revisor-diseno` en paralelo.

## Cómo retomar

En una sesión nueva, di: "Actúa como orquestador según `docs/agents/orquestacion-etapa-1.md` y continúa desde la sección Estado". Antes de lanzar una ola, el orquestador revisa `gh pr list`, `gh issue list` y el CI de `main`.
