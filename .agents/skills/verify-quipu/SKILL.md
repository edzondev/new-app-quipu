---
name: verify-quipu
description: >
  Comprueba un cambio en new-app-quipu (web TanStack Start en el puerto 3000 y
  backend Convex en packages/backend). Úsala antes de dar por listo un PR de
  este repo. Corre install con lockfile congelado, typecheck, oxlint, oxfmt
  --check y vitest del backend. La web no arranca sin los secretos de Convex
  del paso 2.
---

# Verificar Quipu

Comprueba el cambio en este checkout. Los comandos salen de `package.json` de la raíz, de `apps/web` y de `packages/backend`. Ejecútalos desde la raíz del repo. Un código de salida distinto de 0 es un fallo.

No hay harness de navegador. La web no arranca aquí porque faltan los secretos de Convex del paso 2 (los pone Edzon). No inventes `.env.local` ni un deployment para saltarte eso.

## Launch

La comprobación que sí corre no deja un servidor vivo.

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck` (Turbo corre `tsc --noEmit` en `web` y en `@quipu/backend`)
3. `pnpm exec oxlint` (el script `pnpm lint` llama a lo mismo)
4. `pnpm exec oxfmt --check`
5. `pnpm --filter @quipu/backend test` (`vitest run` sobre `packages/backend/__tests__`)
6. `pnpm --filter web build` (Vite + Cloudflare, salida en `apps/web/dist`)

La raíz no tiene script `test`. No uses `pnpm test`.

`pnpm dev` y `pnpm --filter web dev` no llegan a un estado usable en este checkout. `getRouter` en `apps/web/src/router.tsx` lanza `Falta VITE_CONVEX_URL en .env.local` si esa variable no existe. No hay `apps/web/.env.local`. `packages/backend` corre `convex dev`, y eso pide un deployment de Convex que este paso no tiene. El paso 2 define `BETTER_AUTH_SECRET`, `SITE_URL`, `PASSKEY_RP_ID`, `PASSKEY_RP_NAME`, `VITE_CONVEX_SITE_URL` y `VITE_SITE_URL`. Sin eso, no abras el puerto 3000 y no lo cuentes como prueba.

Listo, para esta skill, significa que los seis comandos terminan en 0. No significa que la web responda.

## Doctor

Corre esto antes de repetir la lista si algo se ve mal.

- `node -v` contra `engines.node` de la raíz (`>=24`). Anota la versión real. Una versión menor no tumba los otros comandos por sí sola. Anótala igual.
- `pnpm -v` debe ser `12.14.0` (`packageManager` de la raíz).
- `git status --short` no debe mostrar `pnpm-lock.yaml` después del install congelado.
- Si alguien dejó un `vite` en el puerto 3000, no lo uses. Este checkout no tiene `VITE_CONVEX_URL`.

## Drive

No hay selectores de navegador. El recorrido es la lista de Launch, en ese orden, una vez por cambio.

Qué cubre cada comando.

- El install congelado fija las versiones del lockfile, incluidas `better-auth@1.6.33` y `convex@1.47.0`.
- `pnpm typecheck` cubre la web y el backend.
- `pnpm exec oxlint` aplica `.oxlintrc.json`, incluidas las reglas de Convex. Ignora `**/convex/_generated/**` y `**/routeTree.gen.ts`.
- `pnpm exec oxfmt --check` aplica `.oxfmtrc.json` (tabs, ancho 100, comillas dobles). `.agents/**` está en `ignorePatterns`, así que esta skill no entra en el formato. El comando tiene que terminar en 0.
- `pnpm --filter @quipu/backend test` corre Vitest en `edge-runtime` sobre `packages/backend/__tests__/**/*.test.ts`.
- `pnpm --filter web build` cubre el empaquetado de la web. No sustituye abrir `http://localhost:3000`.

`apps/web` no tiene script `test` ni Vitest. No agregues uno para esta skill.

## Evidence

Guarda en la descripción del PR, en texto, el código de salida de cada comando y la primera línea de error si alguno falla. No hace falta captura de pantalla. La prueba de esta skill es correr la lista una vez y pegar ese resultado.

No cuentes `pnpm dev` como evidencia hasta que exista `apps/web/.env.local` con `VITE_CONVEX_URL` y Convex tenga las variables del paso 2.

## Cleanup

Estos comandos no dejan un proceso. Si un intento anterior sí dejó `vite` o `convex dev`, mata ese pid (el que empezaste), no por nombre. `pnpm install` y el build escriben en `node_modules/` y `apps/web/dist/`. No los borres para "limpiar" una prueba. No borres el texto de evidencia del PR.

## Helpers

Esta skill no trae scripts.
