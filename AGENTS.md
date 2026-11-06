<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# Quipu

- Finanzas personales en soles (S/) para Lima.
- El dinero se divide por ciclos (mes, quincena o semana) en tres sobres: Necesidades, Gustos y Ahorro.
- Cada día la app dice cuánto se puede gastar: lo libre de Necesidades y Gustos, menos los compromisos por pagar, entre los días que quedan. El Ahorro no entra.
- Hay dos espacios: Personal y Nuestro espacio (pareja, exactamente 2 personas).
- Hoy solo existe la web. Está en construcción, pantalla por pantalla.

## Mapa

- `apps/web`: TanStack Start, Router y Query, desplegada en Cloudflare. Rutas en `src/routes`, pantallas en `src/modules/<pantalla>`, piezas base de coss en `src/components/ui`.
- `packages/backend`: Convex. Funciones en `convex/`, lógica compartida entre funciones en `convex/model/`, lógica pura (dinero, fechas, plan) en `shared/`, tests en `__tests__/`.
- `docs/`: diseño, guías, auditoría y `estado.md`. Es local: no se versiona y no existe en un clon limpio.
- `.claude/rules/`: reglas cortas por carpeta. `.claude/skills/`: los skills `quipu-*`.
- `.agents/skills/`: skills de pstack y `verify-quipu`.

## Comandos

Desde la raíz, con Node >= 24 y pnpm 12.14.0.

- Instalar: `pnpm install --frozen-lockfile`
- Desarrollo: `pnpm dev` (web en el puerto 3000 y Convex). Pide `apps/web/.env.local` con `VITE_CONVEX_URL`.
- Tipos: `pnpm typecheck`
- Lint: `pnpm lint`
- Tests: `pnpm --filter @quipu/backend test`. `pnpm test` en la raíz no corre nada y sale con 0: no lo uses.
- e2e web: `pnpm --filter web e2e` (Playwright). Lo que necesita: `.claude/rules/tests.md`.
- Formato: `pnpm exec oxfmt <archivos>` escribe. `pnpm exec oxfmt --check` revisa. En Windows falla en archivos viejos por CRLF; formatea solo los tuyos.
- Build: `pnpm --filter web build`

Para dar un cambio por comprobado, corre la lista de `.agents/skills/verify-quipu/SKILL.md`.

## Reglas duras

- Sin dependencias nuevas sin permiso de Edzon. Un cambio en `pnpm-lock.yaml` sin cambio en `package.json` puede ser intencional: no lo toques.
- Haz solo lo pedido. Nada de extras.
- Sin estados ni errores para casos que todavía no pueden pasar.
- Dinero en céntimos enteros (`isValidCents` en `shared/budget.ts`). Se formatea solo al mostrar.
- Fechas en `America/Lima` (`shared/dates.ts`). Nunca la fecha del navegador ni de UTC.
- Código e identificadores en inglés. Textos para el usuario en español.
- Código simple: DRY, KISS, sin capas de una sola llamada. Cada efecto y cada función tiene una razón.
- Un PR por unidad de trabajo, en su propia rama. Nunca hagas merge sin permiso de Edzon.
- Git: agrega archivos por nombre, nunca `git add -A` ni `git add .`. Nunca `restore`, `checkout --`, `stash` ni `clean`. Nunca borres archivos de Edzon.
- Nunca subas `docs/`, `diseno/`, `guias-pantallas/` ni `rediseno-movil.html`.

## Fuentes de diseño

Manda la de más arriba. Si dos chocan, gana la primera.

1. El HTML `docs/diseno/rediseno-movil.html`, sección `#s-web`, pantallas `W-*`. Pesa 800 KB: léelo por pantalla con `node .claude/skills/quipu-pantalla/leer-w.mjs W-Inicio`.
2. `docs/diseno/inventario-pantallas-web.md`.
3. `docs/diseno/onboarding-web.md` (solo Primeros pasos).
4. `docs/guias-pantallas/` (solo estructura, archivos y backend).

Si algo no está definido en ninguna, no lo inventes: pregunta.

`docs/` está en el checkout principal. En un worktree búscalo en `$(git rev-parse --path-format=absolute --git-common-dir)/../docs`. Si no existe, para y avisa a Edzon.

## Dónde está cada cosa

- Dónde estamos y qué sigue: `/quipu-estado` (lee `docs/estado.md`).
- Construir o terminar una pantalla: `/quipu-pantalla`.
- Query o mutación de Convex: `/quipu-backend`.
- Revisar un diff: `/quipu-revision`.
- Cerrar una unidad y abrir el PR: `/quipu-cerrar-unidad`.
- Reglas por carpeta: `.claude/rules/` (`backend.md`, `web-rutas.md`, `web-ui.md`, `tests.md`).
- Reglas del dinero (ciclos, sobres, arrastre, número del día): `docs/diseno/reglas-backend.txt`.
- Lo que falta en cada pantalla: `docs/auditoria/AUDITORIA.md` §4 (histórico; búscalo con `grep -n`, no lo leas entero).

Los skills están en `.claude/skills/<nombre>/SKILL.md`. Si tu agente no los carga solo, lee ese archivo.
