---
name: quipu-cerrar-unidad
description: Cierra una unidad de trabajo de Quipu. Corre los checks, actualiza docs/estado.md y abre el PR. Úsalo cuando el código de la unidad está listo, o cuando quipu-estado detecta que estado.md quedó atrás.
---

# Cerrar una unidad

Esto es lo que evita perder el estado. No te saltes el paso 5.

1. Alcance: `git diff master...HEAD --stat` contra el «Terminado» y el «Fuera» de la unidad en `docs/estado.md`.
2. Checks: la lista de `.agents/skills/verify-quipu/SKILL.md`. Guarda el código de salida de cada comando.
3. Revisión: `/quipu-revision`. Sigue solo con `PASA`.
4. Commit: agrega archivos por nombre. Asunto en inglés, imperativo, una línea, como el historial de git.
5. Estado, solo en `docs/estado.md`:
   - Mueve la unidad a «Hecho» con su PR y la fecha.
   - Sube la siguiente a «Unidad actual», respetando dependencias. Copia su bloque de la cola con `grep -n "^\*\*U7\." docs/auditoria/AUDITORIA.md` (cambia el número; sirve `tgrep`). Es la única lectura permitida de ese archivo.
   - Completa «Siguientes 5» desde la cola.
   - Tacha preguntas resueltas. Pasa lo decidido a «Decidido».
   - Cambia la fecha y el commit de `master` del encabezado.
6. PR: `git push -u origin <rama>` y `gh pr create`, en español, con estas secciones:
   - **Por qué**: el objetivo de la unidad, en una frase.
   - **Qué cambia**: lista corta por archivo.
   - **Fuera de alcance**
   - **Checks**: cada comando con su código de salida.
   - **Verificación**: lo que viste en el navegador, o «no verificado en navegador» con la razón.
7. Termina. Nunca hagas merge. Dile a Edzon que el PR está listo.

`docs/estado.md` no se sube: es local. Lo único que llega a GitHub es el código.
