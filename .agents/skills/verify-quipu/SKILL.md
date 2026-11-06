---
name: verify-quipu
description: Comprueba un cambio de Quipu antes de darlo por listo. Corre typecheck, lint, los tests del backend y el e2e de la web, desde la raíz del repo.
---

# Verificar Quipu

Corre esta lista desde la raíz, en este orden. Un código de salida distinto de 0 es un fallo.

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm --filter @quipu/backend test`
4. `pnpm --filter web e2e`

- La raíz no tiene `pnpm test`: no lo uses.
- El e2e necesita `apps/web/.env.local`, las funciones desplegadas en Convex dev y Chromium. Ver `.claude/rules/tests.md`.
- Un `test.fixme` sale como omitido, no como verde: dilo en el reporte.
- Guarda el código de salida de cada comando en la descripción del PR.
