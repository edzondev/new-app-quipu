---
paths:
  - "**/*.test.*"
  - "apps/web/e2e/**"
---

# Tests

Backend: Vitest en `packages/backend` (`pnpm --filter @quipu/backend test`). Web: solo Playwright e2e en `apps/web/e2e` (`pnpm --filter web e2e`). **No hay Vitest en `apps/web`: no agregues uno.**

## Backend (Vitest)

1. **Prueba lo que el usuario observa.** Entra por la API con sesión real (`signIn`, `ana.mutation(api.x.y, ...)`) y lee saldos o filas. No mires internos.
   - Bueno: `household.test.ts:98-100`. Otra persona no puede borrar un gasto, con el mensaje exacto.
   - Bueno: `cycles.test.ts:168-181`. El 31 oct a las 20:00 en Lima no cierra, aunque en UTC ya sea 1 nov.
2. **El test tiene que fallar si el código se rompe.** Antes de darlo por bueno, rompe la línea y míralo fallar. Un bug se arregla con un test rojo antes y verde después.
   - Malo: `budget.test.ts:101-111` prueba `reallocateFree` con `reserved`, pero `settings.ts:39` nunca lo pasa. B4 está roto y la suite sale en verde.
3. **Tiempo fijo, antes de `signIn`.** `convex-test` no deja que `_creationTime` retroceda: si `signIn` corre con el reloj real, todo lo que crees después queda fechado hoy. Las reservas de compromisos dependen de esa fecha.
   - Bueno: `startAnaOct20` (`commitments.test.ts:135`) fija el reloj, hace `signIn` y alarga la sesión (dura 7 días) para poder saltar a noviembre.
   - Para llegar a diciembre sin saltar el reloj, llama al modelo con una fecha explícita (`cycles.test.ts:187-191`).
4. **Un test por comportamiento.** El nombre dice el caso (`cycles.test.ts:168`). Dinero en céntimos redondos (`5_000`). Caso base de la auditoría: Ana entra el 20 oct con S/ 500, ciclo mensual del 1, reparto 50/30/20.
5. **Harness.** Cada archivo define su `harness()` (`transactions.test.ts:17-23`). En un archivo nuevo, copia ese. Unificarlos es otra tarea.

## e2e web (Playwright)

1. **Qué necesita.** `apps/web/.env.local`, las funciones de Convex desplegadas en tu deployment dev, la CLI de Convex con sesión iniciada (`convex logs` entrega el código) y Chromium. Si el backend cambió: `pnpm --filter @quipu/backend exec convex dev --once`. Chromium, una vez: `pnpm --filter web exec playwright install chromium`. El script no despliega por su cuenta.
2. **Un usuario nuevo por corrida** (`ana-<tiempo>@e2e.quipu.test`). `auth.setup.ts` lo crea por la UI y `support/otp.ts` lee el código del log de Convex (`OTP_DELIVERY=log`). No se manda correo.
3. **Specs en serie, con la misma Ana.** Cada test tiene que valer en cualquier orden y cualquier día: no asumas el número de hoy ni la fecha. Compara antes y después, no valores fijos. No lo corras cerca de la medianoche de Lima (05:00 UTC): el día cambia, la página se remonta con `key={today}` y borra el diálogo abierto.
4. **Entra con `open(page, ruta)`, no con `page.goto`.** La página es SSR: un clic o texto antes de hidratar se pierde.
5. **Selectores por rol y texto visible.** Sin ids de prueba y sin `waitForTimeout`. Un caso por flujo que el usuario ve. La regla 2 de backend vale igual: rompe la línea y míralo fallar.
6. **El sueldo adelantado se prueba en backend.** Solo aparece en los últimos días del ciclo y la fecha no se puede forzar de punta a punta.
7. **`test.fixme` es un bug conocido, no un verde.** Lleva la causa en un comentario. Hoy: el doble clic en Registrar, Compromisos y Ahorros.
8. **Cómo mirar.** `pnpm --filter web e2e --headed`, `--debug` o `e2e:ui`. Capturas en `apps/web/test-results/`; con un fallo hay trace: `pnpm --filter web exec playwright show-trace <carpeta>/trace.zip`.
