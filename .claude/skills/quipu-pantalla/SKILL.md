---
name: quipu-pantalla
description: Construye o termina una pantalla de Quipu, por defecto en la app móvil (apps/mobile); la web (apps/web) solo para bugs y ajustes. Lee solo la sección de esa pantalla. Úsalo cuando la unidad actual sea una pantalla.
---

# Construir una pantalla

Móvil es lo que se construye ahora. Web queda para bugs y ajustes. Las reglas de `.claude/rules/` cargan solas (`mobile.md` o `web-ui.md` y `web-rutas.md`). No leas el HTML entero ni el inventario entero.

## Qué leer, solo esto

`leer-w.mjs` imprime un bloque del diseño por su id (1 a 3 KB): `node .claude/skills/quipu-pantalla/leer-w.mjs E1` (Android, por defecto) o `node .claude/skills/quipu-pantalla/leer-w.mjs E1 ios`. Trae los textos de la pantalla y sus notas de comportamiento («Detalle por pantalla»). Las medidas no salen ahí: las mandan los bloques `componentes` y `tokens`.

### Móvil

Mandan `docs/diseno/diseno-android.html` (129 pantallas) y `diseno-ios.html` (119). **Android es el diseño por defecto; iOS solo se lee cuando la unidad lo pide, y si chocan gana Android.** Los ids son los mismos en los dos: las pantallas que solo existen en Android (M1 a M7, K1b, K3c y K3d) se leen de Android aunque pidas iOS. Las secciones van con letras seguidas, A a O, **en el orden en que se recorre la app**: construye en ese orden. Dentro de una sección, la primera pantalla es la base; luego van sus estados, hojas y variantes.

| Sección | Pantalla                                      | Ids                                                                       |
| ------- | --------------------------------------------- | ------------------------------------------------------------------------- |
| A       | Entrar a Quipu                                | A1, A1e, A2, A2e, A3                                                      |
| B       | Primeros pasos                                | B1, B2, B2s, B2v-mes, B2v-semana, B2v-sinfijo, B3, B4, B5-paso1, B5-paso2 |
| C       | Inicio                                        | C1, C2, C2b, C2c, C3, C4, C5, C6                                          |
| D       | Registrar (hoja de gasto, ingreso y editar)   | D1, D2, D2e, D2a, D2b, D3, D4, D4i                                        |
| E       | Movimientos                                   | E1 a E8                                                                   |
| F       | Compromisos                                   | F1 a F6                                                                   |
| G       | Ahorros                                       | G1 a G7e                                                                  |
| H       | Progreso y racha                              | H1                                                                        |
| I       | Cierre de ciclo                               | I1 a I4                                                                   |
| J       | Nuestro espacio (pareja)                      | J1 a J18b                                                                 |
| K       | Quipu Plus                                    | K1 a K1e, K2a a K2d, K3a a K3e (K1b, K3c y K3d solo Android)              |
| L       | Ajustes y seguridad                           | L1, L1b, L1c, L2 a L4, L5, L5b, L5c, L5c-e, L6, L6q                       |
| M       | Detección de gastos (solo Android)            | M1 a M7                                                                   |
| N       | Voz                                           | N1 a N4, NE1 a NE4                                                        |
| O       | Estados: cargando, error, sin conexión, vacío | O1 a O8                                                                   |

- No se construyen el widget y los accesos del ícono ni las pantallas grandes y plegables (Q). «Por dibujar» (bloque `dibujar`) lista lo que el diseño aún no trae: no lo inventes.
- **Flujo entre pantallas:** `node .claude/skills/quipu-pantalla/leer-w.mjs mapa | head -8` trae el mapa de navegación y los recorridos. Úsalo para saber de dónde viene y a dónde va la pantalla.
- **Otros bloques de referencia**, solo si la unidad los pide: `componentes`, `tokens`, `movimiento` (movimiento y vibración o hápticos), `android` o `ios` (comportamiento de la plataforma), `ids`, `dibujar` y `reglas` (reglas del dinero). Pesan hasta 8 KB: filtra con `| head` o `| grep`.
- **Ids de prompts y PRs viejos.** Los anteriores a este diseño pueden no coincidir: Estados era P1 a P8 y hoy es O1 a O8. Compruébalos con `leer-w.mjs <id>` antes de fiarte. Si un prompt y el diseño difieren, manda el diseño; dile a Edzon la diferencia.

### Web

La web ya no tiene HTML de diseño. Para bugs y ajustes manda el inventario, luego las guías, y si falta algo, pregunta a Edzon.

| Pantalla        | Inventario                            | Guía       |
| --------------- | ------------------------------------- | ---------- |
| Portada         | §10                                   | 10-portada |
| Cuenta y Entrar | «Ya construido»                       | 00         |
| Primeros pasos  | «Ya construido» y `onboarding-web.md` | 00         |
| Inicio          | §1 y §7                               | 01, 07     |
| Registrar       | §2                                    | 02         |
| Movimientos     | §3                                    | 03         |
| Compromisos     | §4                                    | 04         |
| Ahorros         | §5                                    | 05         |
| Progreso        | §6                                    | 06         |
| Nuestro espacio | §8                                    | 08         |
| Ajustes         | §9                                    | 09         |

- Inventario (solo web): busca la línea con `grep -n "^## 4[)]" docs/diseno/inventario-pantallas-web.md` (o `tgrep`) y lee desde ella hasta el siguiente `## `. Antes, lee §0 si tocas barra, tema o avisos.
- Guía: `docs/guias-pantallas/NN-*.md`, solo para estructura, archivos y backend. Describe la web: en móvil, la forma de los datos sirve y el resto no. Si choca con el diseño móvil, gana el diseño.

## Código

- Copia una pantalla parecida ya hecha (Inicio en móvil): mismo `ScrollView` e insets, `TAB_BAR_SPACE`, mismo estilo de título de sección.
- Antes de escribir, ¿hace falta este código? (`/ponytail`). Solo lo que dibuja el diseño. Textos literales. Sin estados para casos que no pasan.
- La lógica va fuera de los componentes, en funciones puras de un `.ts` aparte.
- Falta una query o mutación: `/quipu-backend` primero. Con datos de ejemplo, tipa el ejemplo con `FunctionReturnType` de la query real.
- Estilos con `/uniwind`. Cuando toque, carga: `/expo-router` (rutas, pestañas, hojas), `/expo-animation` (movimiento y gestos), `/expo-data-fetching` (al conectar Convex real: cargando, error, sin conexión), `/expo-native-ui` (la pantalla; el diseño manda sobre su estética, regla 14 de `mobile.md`), `/expo-ui` (solo si el diseño pide un control nativo y la dependencia ya está instalada; si no, pregunta).
- Una skill que propone una dependencia nueva no es permiso para instalarla.
