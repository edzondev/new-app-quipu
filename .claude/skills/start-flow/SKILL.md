---
name: start-flow
description: Arranca y conduce una unidad de trabajo de Quipu de principio a fin con el flujo definido (estado, rama, plan, backend, pantalla, checks, revisión, PR). Recibe como argumento el prompt, texto o ruta de archivo (por ejemplo prompt.md) con el detalle de la unidad. Úsalo cuando Edzon empiece una unidad nueva.
argument-hint: <prompt de la unidad, o ruta al archivo que lo trae>
---

# Flujo de una unidad

Argumento: `$ARGUMENTS`

Si es una ruta a un archivo (`prompt.md`, etc.), léelo entero. Si está vacío, pregunta a Edzon qué unidad toca; no la inventes. Este skill solo ordena: cada paso lo hace la skill que nombra, y esa manda sobre lo que aquí se resume.

Las reglas duras de `AGENTS.md` aplican siempre: sin dependencias nuevas, solo lo pedido, `git add` por nombre, nunca `restore`/`checkout --`/`stash`/`clean`, nunca subir `docs/` ni el HTML, nunca merge.

## Pasos

1. **Dónde estamos.** `/quipu-estado`. Contrasta con el prompt: unidad, rama, PR, desfases. Si `estado.md` quedó atrás, dilo.
2. **Entender el prompt.** Del argumento saca: objetivo, pantallas o ids de diseño, archivos a copiar, rama pedida, qué queda fuera y límites (por ejemplo «sin límite de líneas»). Lee lo que el prompt manda leer antes de empezar. Diseño solo con `leer-w.mjs <id>` (Android por defecto, `<id> ios` si la unidad lo pide), nunca el HTML entero. Si el prompt y el diseño chocan, manda el diseño y le dices la diferencia a Edzon. Si algo no está definido, pregunta.
3. **Rama.** Desde `master` al día, con el nombre que pida el prompt (móvil `feature/quipu-<tema>`, web `feat/<unidad>-<tema>`). No toques el árbol de Edzon: archivos sin seguimiento como `prompt.md` se quedan fuera.
4. **Plan, en 6 líneas** (formato de `/quipu-pantalla`, paso 3): qué cambia, archivos, textos del diseño, qué queda fuera, cómo se verá que funciona, y abstracciones o efectos con su razón (o «ninguno»). **Para y espera el OK de Edzon.**
5. **Backend, si la unidad lo pide.** `/quipu-backend`: test en rojo primero. Nunca edites `api.d.ts` a mano. Si va solo UI con datos de ejemplo, tipa con `FunctionReturnType` de la query real y salta este paso.
6. **Pantalla.** `/quipu-pantalla` (carga `/uniwind` y las demás de Expo cuando toquen). Para bugs o lógica sin pantalla, `/diagnosing-bugs`: reproduce primero.
7. **Limpiar.** `/simplify` sobre lo escrito.
8. **Checks.** `verify-quipu`, guardando el código de salida de cada comando. Formatea solo tus archivos con `pnpm exec oxfmt <archivos>`. Sin e2e ni Playwright MCP: dile a Edzon qué recorrer en el dispositivo (tema claro y oscuro, fuente grande, 360 dp).
9. **Revisión.** `/quipu-revision`. Si dice `ARREGLA ESTO`, arregla y repite. `/receiving-code-review` si Edzon trae comentarios. Sigue solo con `PASA`.
10. **Cierre.** Commit por nombre de archivo y `/quipu-cerrar-unidad` (actualiza `estado.md` y abre el PR). El PR no lleva sección «Capturas». En «Checks» di «e2e: no corrido, diferido al final del proyecto». No hagas merge: avisa a Edzon que el PR está listo.

## En cada respuesta

- Di en qué paso del flujo estás (por ejemplo «paso 6 de 10»).
- Cierra con **Siguiente paso**: qué skill o comando sigue, quién lo invoca (tú con Skill, o Edzon escribiéndolo con `/`, como las `principle-*`) y por qué. Si una `principle-*` no carga por `disable-model-invocation`, no la repliques: dile que la ejecute.
- Si te bloquea una decisión que es de Edzon, pregunta y para; no avances con una suposición.
