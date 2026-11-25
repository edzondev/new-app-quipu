---
name: verify-quipu
description: Comprueba un cambio de Quipu (móvil o web) antes de darlo por listo. Corre typecheck, lint, los tests del backend y, en móvil, el bundle de Android, desde la raíz del repo.
---

# Verificar Quipu

Corre esta lista desde la raíz, en este orden. Un código de salida distinto de 0 es un fallo.

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm --filter @quipu/backend test` (si tocaste `packages/backend`) y `pnpm --filter mobile test` (si tocaste lógica pura en `apps/mobile`)
4. Solo móvil: `pnpm --filter mobile exec expo export --platform android`. Compila el bundle con Metro y Uniwind: atrapa imports rotos y clases que no existen. Escribe en `apps/mobile/dist/` (ignorado por git).
5. `pnpm --filter web e2e` solo si Edzon lo pide: están diferidos al final del proyecto (decisión del 8 nov).

- La raíz no tiene `pnpm test`: no lo uses.
- La app móvil solo tiene tests unitarios de lógica pura (Vitest) y ningún e2e: lo que se ve en pantalla lo prueba Edzon en el dispositivo (dile qué recorrer).
- El e2e necesita `apps/web/.env.local`, las funciones desplegadas en Convex dev y Chromium. Ver `.claude/rules/tests.md`.
- Un `test.fixme` sale como omitido, no como verde: dilo en el reporte.
- Guarda el código de salida de cada comando en la descripción del PR.
- Verifica contra lo real: salida de comandos o dispositivo, no «compila».
- Un test sirve si falla al romper la línea que prueba. Si pasa con el código roto, no prueba nada.
- Web: si existe `apps/web/.env.local` con `VITE_CONVEX_URL`, corre `pnpm dev`, abre `http://localhost:3000` y recorre el «Terminado» también a 375 px. Si no existe, escribe en el PR «no verificado en navegador: falta `.env.local`».
- Móvil: no uses Playwright ni lances emuladores. Anota en el PR «pendiente de Edzon» y dile qué recorrer (tema claro y oscuro, fuente grande, 360 dp).
