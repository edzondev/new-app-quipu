---
paths:
  - "packages/backend/convex/**"
  - "packages/backend/shared/**"
---

# Backend (Convex)

1. **Valida los args y lo que el validador no cubre.** Cada función declara `args` y `returns` con `v.*`. El handler valida el resto: `isValidCents`, `cleanNote`.
   - Bueno: `transactions.ts:69-79` (`addExpense`): args, `returns: v.null()` y `isValidCents` al empezar.
   - Malo: `transactions.ts:249-268` (`withdrawSaving`): el cliente elige el sobre y el motivo queda fijo en `"other"`. El diseño manda el retiro a Necesidades y pide motivo (L3).
2. **El espacio sale de la sesión, nunca de un id del cliente.** Usa `requireOpenCycle` (`model/cycles.ts:53`) o `requireSpace` (`model/spaces.ts:28`). Para editar o borrar una fila, `requireOwnOpenRow` (`transactions.ts:32-50`): mismo espacio, mismo ciclo abierto, mismo autor.
   - Bueno: `deleteExpense` (`transactions.ts:125-130`) pasa por `requireOwnOpenRow`. Lo prueba `household.test.ts:98-100`.
   - Malo: `markPaid` (`commitments.ts:127-129`) repite a mano lo que ya hace `requireOwnCommitment` (`:34-39`).
3. **Dinero en céntimos enteros.** Las cuentas de sobres pasan por `patchEnvelope` o por `shared/budget.ts`.
   - Bueno: `patchEnvelope` (`transactions.ts:52-58`) lo usan todas las mutaciones de gasto.
   - Malo: `commitments.ts:152-154` arma el sobre a mano: la misma cuenta, escrita dos veces.
4. **Índices y lecturas con tope.** Toda consulta usa `.withIndex` de `schema.ts` y termina en `.first()`, `.unique()` o `.take(n)`. Sin `.filter` ni `.collect()`. Un índice nuevo va en `schema.ts`.
   - Bueno: `model/cycles.ts:31-37` (`by_space_start` con `.lte` y `.first()`).
5. **Sin lógica duplicada.** La misma cuenta, constante o mensaje vive en un solo sitio.
   - Bueno: `requireOpenCycle` lo reusan `balances.ts`, `transactions.ts`, `commitments.ts` y `settings.ts`.
   - Malo: `BAD_INPUT` se define en `transactions.ts:20`, `commitments.ts:11` y `settings.ts:9`.
6. **Errores para el usuario.** `ConvexError` con texto en español, que el cliente muestra tal cual (`transactions.ts:20-23`).
