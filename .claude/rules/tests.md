---
paths:
  - "**/*.test.*"
---

# Tests

Solo `packages/backend` tiene Vitest: `pnpm --filter @quipu/backend test`. `apps/web` no tiene runner: no agregues uno.

1. **Prueba lo que el usuario observa.** Entra por la API con sesión real (`signIn`, `ana.mutation(api.x.y, ...)`) y lee saldos o filas. No mires internos.
   - Bueno: `household.test.ts:98-100`. Otra persona no puede borrar un gasto, con el mensaje exacto.
   - Bueno: `cycles.test.ts:168-181`. El 31 oct a las 20:00 en Lima no cierra, aunque en UTC ya sea 1 nov.
2. **El test tiene que fallar si el código se rompe.** Antes de darlo por bueno, rompe la línea y míralo fallar. Un bug se arregla con un test rojo antes y verde después.
   - Malo: `budget.test.ts:101-111` prueba `reallocateFree` con `reserved`, pero `settings.ts:39` nunca lo pasa. B4 está roto y la suite sale en verde.
   - Malo: `balances.test.ts:219-249` fija `dueSoon` en 3 días y W-Inicio pide «los 3 siguientes». Cámbialo junto con la pantalla.
3. **Tiempo fijo.** `vi.useFakeTimers({ now: new Date("2026-10-20T17:00:00.000Z") })` (`balances.test.ts:222`). Para saltar meses, llama al modelo con una fecha explícita: la sesión de Better Auth vence (`cycles.test.ts:187-191`).
4. **Un test por comportamiento.** El nombre dice el caso (`cycles.test.ts:168`). Dinero en céntimos redondos (`5_000`). Caso base de la auditoría: Ana entra el 20 oct con S/ 500, ciclo mensual del 1, reparto 50/30/20.
5. **Harness.** Cada archivo define su `harness()` (`transactions.test.ts:17-23`). En un archivo nuevo, copia ese. Unificarlos es otra tarea.
