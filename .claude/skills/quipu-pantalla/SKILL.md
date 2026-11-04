---
name: quipu-pantalla
description: Construye o termina una pantalla de la web de Quipu (Inicio, Registrar, Movimientos, Compromisos, Ahorros, Progreso, Ajustes, Portada, Primeros pasos). Lee solo la sección de esa pantalla. Úsalo cuando la unidad actual sea una pantalla.
---

# Construir una pantalla

Las reglas de `.claude/rules/` cargan solas. No leas el inventario ni el HTML enteros.

## Qué leer, solo esto

| Pantalla        | HTML `W-*`           | Inventario                            | Guía       |
| --------------- | -------------------- | ------------------------------------- | ---------- |
| Portada         | W-Portada            | §10                                   | 10-portada |
| Cuenta y Entrar | W-Cuenta, W-Entrar   | «Ya construido»                       | 00         |
| Primeros pasos  | W-Pasos              | «Ya construido» y `onboarding-web.md` | 00         |
| Inicio          | W-Inicio, W-Cierre   | §1 y §7                               | 01, 07     |
| Registrar       | W-Registrar          | §2                                    | 02         |
| Movimientos     | W-Movimientos        | §3                                    | 03         |
| Compromisos     | W-Compromisos        | §4                                    | 04         |
| Ahorros         | W-Ahorros, W-Aportar | §5                                    | 05         |
| Progreso        | W-Progreso           | §6                                    | 06         |
| Nuestro espacio | W-Espacio, W-Plus6   | §8                                    | 08         |
| Ajustes         | W-Ajustes            | §9                                    | 09         |

- HTML: `node .claude/skills/quipu-pantalla/leer-w.mjs W-Inicio`. Imprime el texto de esa pantalla (1 a 3 KB).
- Inventario: busca la línea con `grep -n "^## 4[)]" docs/diseno/inventario-pantallas-web.md` (o `tgrep`) y lee desde ella hasta el siguiente `## `. Antes, lee §0 si tocas barra, tema o avisos.
- Guía: `docs/guias-pantallas/NN-*.md`, solo para estructura, archivos y backend. Si choca con el HTML o el inventario, gana el HTML (ver «Fuentes de diseño» en AGENTS.md).

## Pasos

1. Confirma la unidad con `/quipu-estado`. Rama nueva desde `master` al día: `feat/<unidad>-<tema>`, por ejemplo `feat/u3-compromisos`.
2. Plan en 5 líneas: qué cambia, archivos, qué textos pone el HTML, qué queda fuera, cómo verás que funciona. Usa el «Terminado» de la unidad.
3. Falta una query o mutación: `/quipu-backend` primero.
4. Código. Solo lo que dibuja el HTML. Textos literales. Sin estados para casos que no pasan.
5. Checks: la lista de `.agents/skills/verify-quipu/SKILL.md`. Formatea solo tus archivos: `pnpm exec oxfmt <archivos>`.
6. Navegador. Si existe `apps/web/.env.local` con `VITE_CONVEX_URL`, corre `pnpm dev`, abre `http://localhost:3000` y recorre el «Terminado» de la unidad, también en 375 px de ancho. Si no existe, no inventes uno: escribe en el PR «no verificado en navegador: falta `.env.local`».
7. `/quipu-revision` y luego `/quipu-cerrar-unidad`.
