---
name: quipu-estado
description: Dice dónde está el proyecto Quipu y cuál es la siguiente unidad de trabajo. Úsalo al empezar cualquier sesión y cuando pregunten "dónde estamos", "qué sigue" o "en qué quedamos". Lee solo docs/estado.md y git. No lee AUDITORIA.md.
---

# Dónde estamos

Solo lectura. No edites nada.

1. Lee `docs/estado.md` entero. Es corto. Si no existe, para y avisa a Edzon (ver «docs/» en AGENTS.md para los worktrees).
2. Contrasta con git:
   - `git log --oneline -10 master`
   - `git branch --list` y `gh pr list --state all --limit 5`
3. Busca desfases. Si la unidad actual ya tiene un PR mergeado, o hay una rama con su nombre, `estado.md` quedó atrás. Dilo y propón `/quipu-cerrar-unidad`.
4. Responde en 8 líneas o menos:
   - Unidad actual: id, título, rama y PR si existen.
   - Qué falta para darla por terminada (su línea «Terminado»).
   - Siguiente unidad después de esta.
   - Preguntas abiertas que la bloquean, si hay.

No abras `AUDITORIA.md` aquí. Si necesitas la fila de una pantalla, búscala con `grep -n` en esa sección.

Si la siguiente acción es una unidad de pantalla, backend o revisión, dilo en una línea y recuerda cargar la skill que toca de esta lista, no otra: `/quipu-pantalla`, `/quipu-backend`, `/quipu-revision`.
