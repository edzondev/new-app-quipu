---
name: quipu-revision
description: Revisa un diff de Quipu contra el diseño y los casos límite (carreras, doble clic, cambio de día o ciclo, cambio de espacio, texto largo, permisos, tests que no prueban nada). Úsalo antes de abrir un PR o al revisar uno ajeno. Termina en "PASA" o "ARREGLA ESTO".
---

# Revisión

1. Saca el diff: `git diff master...HEAD` (o `gh pr diff <n>`). Lista los archivos.
2. Alcance. Compara con la unidad en `docs/estado.md`. Marca todo lo que esté fuera de su «Terminado» o dentro de su «Fuera». Marca también dependencias nuevas, `docs/`, el HTML y cambios en `pnpm-lock.yaml`.
3. Diseño. Por cada pantalla tocada, `node .claude/skills/quipu-pantalla/leer-w.mjs W-<Pantalla>`. Compara textos letra por letra, orden de elementos y toques de 44 px.
4. Casos límite. Para cada uno, nombra la línea que lo cubre o di que no hay:
   - Doble clic: el botón queda apagado mientras guarda (`register-form.tsx:202-204`).
   - Cambio de día con la pantalla abierta: `key={today}` (`home-page.tsx:28-32`).
   - Cambio de ciclo y de `?space=`: las queries llevan `space` y `today` en la clave.
   - Carreras: dos pestañas, o dos personas en Nuestro espacio, escribiendo a la vez.
   - Texto largo y montos de 4 cifras en 375 px.
   - Permisos: solo el autor edita o borra; el espacio sale de la sesión.
   - Dinero en céntimos enteros y fechas en Lima.
5. Tests. Por cada test nuevo, pregunta: si rompo la línea que arregla esto, ¿falla? Si pasa con el código roto, no prueba nada.
6. Código. Funciones de una sola llamada, efectos sin razón, lógica repetida, abstracciones sin caso que las pida. Para bugs genéricos carga `/ponytail-review` (cada hallazgo con un caso concreto; nada de gustos de estilo). Si hay un bug real, carga `diagnosing-bugs` (reproduce primero, arregla la causa raíz).
7. Veredicto, en este formato:
   - `PASA`, con una línea de por qué.
   - `ARREGLA ESTO`, con una lista: `archivo:línea`, qué falla, arreglo mínimo.

No edites el código. Solo reporta.
