---
name: quipu-backend
description: Agrega o cambia una query o mutación de Convex en packages/backend, con sus tests. Úsalo cuando la unidad toque convex/, model/ o shared/.
---

# Query o mutación de Convex

Las reglas de `.claude/rules/backend.md` y `tests.md` cargan solas. Aquí va el orden.

1. Lee el archivo que vas a tocar y los helpers de `convex/model/` y `shared/` que ya resuelven lo tuyo (`requireOpenCycle`, `requireSpace`, `patchEnvelope`, `isValidCents`). No escribas otra versión.
2. Define el dato primero: qué tabla, qué índice (`schema.ts`), qué devuelve. La regla de dinero (ciclos, sobres, arrastre, número del día) está en `docs/diseno/reglas-backend.txt`.
3. Escribe el test en `packages/backend/__tests__/` y míralo fallar. Copia el `harness()` del test más cercano. Recuerda a Edzon que ejecute `/principle-test-behavior-not-implementation` (solo él puede invocarla): el test prueba lo que ve quien llama a la query o mutación, no su implementación.
4. Implementa con `args` y `returns`, y permisos por helper. Carga `convex-reviewer` y `workers-best-practices` solo si aplican al archivo que tocas. Reusa los helpers de `convex/model/` y `shared/` antes de escribir lógica nueva. No agregues validadores ni capas más allá de lo que pide la unidad; recuerda a Edzon que ejecute `/principle-subtract-before-you-add` (solo él puede invocarla).
5. Archivo nuevo en `convex/` (también en `model/`): `convex/_generated/api.d.ts` está versionado y lo regenera `npx convex dev`. Sin deployment, agrega a mano su `import type * as` y su entrada en `fullApi`, igual que las demás. Dilo en el PR.
6. Corre `pnpm --filter @quipu/backend test`, `pnpm typecheck` y `pnpm lint`. Luego `pnpm exec oxfmt <tus archivos>`.
7. Si la web va a usar la función, deja el nombre y la forma de lo que devuelve en el PR.

No hagas migraciones de datos ni cambies el esquema más allá de lo que pide la unidad.
