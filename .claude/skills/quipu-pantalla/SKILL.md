---
name: quipu-pantalla
description: Construye o termina una pantalla de Quipu, por defecto en la app móvil (apps/mobile); la web (apps/web) solo para bugs y ajustes. Lee solo la sección de esa pantalla. Úsalo cuando la unidad actual sea una pantalla.
---

# Construir una pantalla

Móvil es lo que se construye ahora. Web queda para bugs y ajustes. Las reglas de `.claude/rules/` cargan solas (`mobile.md` o `web-ui.md` y `web-rutas.md`). No leas el HTML entero ni el inventario entero.

## Qué leer, solo esto

`leer-w.mjs` imprime un bloque del HTML por su id (1 a 3 KB): `node .claude/skills/quipu-pantalla/leer-w.mjs E1`.

### Móvil

El HTML (`rediseno-movil.html`, versión del 16 nov) manda. Las secciones van con letras seguidas, A a P, **en el orden en que se recorre la app**: construye en ese orden. Dentro de una sección, la primera pantalla es la base; luego van sus estados, hojas y variantes.

| Sección | Pantalla                                      | Ids                                      |
| ------- | --------------------------------------------- | ---------------------------------------- |
| A       | Entrar a Quipu                                | A1, A1e, A3, A3e, A4                     |
| B       | Primeros pasos                                | B1, B1s, B2, B3, B3s, B4-paso1, B4-paso2 |
| C       | Inicio (y cierre de ciclo en pantalla)        | C1, C2, C2b, C2c, C4, C6, C7, C8         |
| D       | Registrar (hoja de gasto, ingreso y editar)   | D1, D2, D2e, D2a, D2b, D3, D4, D4i       |
| E       | Movimientos                                   | E1 a E8                                  |
| F       | Compromisos                                   | F1 a F6                                  |
| G       | Ahorros                                       | G1 a G7e                                 |
| H       | Progreso                                      | H1                                       |
| I       | Cierre de ciclo                               | I1 a I4                                  |
| J       | Nuestro espacio (pareja)                      | J1 a J18b                                |
| K       | Quipu Plus                                    | K1 a K1e, K2a a K2d, K4a a K4e           |
| L       | Ajustes y eliminar cuenta                     | L1 a L7                                  |
| M       | Detección de gastos (Android)                 | M1, M4 a M9                              |
| N       | Voz                                           | N2 a N5, NE1 a NE4                       |
| O       | Widget y accesos del ícono                    | O1 a O4                                  |
| P       | Estados: cargando, error, sin conexión, vacío | P1 a P8                                  |

- Los ids «Reemplazado» o «Retirado» no se construyen (A2, A5, A6, K3a a K3c, L5, M1b a M1e). La sección Q (pantallas grandes y plegables) no se construye.
- **Flujo entre pantallas:** `node .claude/skills/quipu-pantalla/leer-w.mjs mapa | head -8` trae el mapa de navegación y los recorridos. Úsalo para saber de dónde viene y a dónde va la pantalla.
- **Otros bloques de referencia**, solo si la unidad los pide: `componentes`, `tokens`, `decisiones`, `cambios` (qué cambió, por fecha) y `backend` (reglas del dinero). Pesan de 10 a 50 KB: filtra con `| head` o `| grep`.
- **Códigos viejos.** Los prompts, PRs y `estado.md` anteriores al 16 nov usan los códigos de antes (`M1` era Movimientos y hoy es `E1`; `H1`, hoy `G1`). Tradúcelos: `node .claude/skills/quipu-pantalla/leer-w.mjs equivalencia | grep "^M1 "`. Si el prompt y el HTML nuevo difieren (por ejemplo, filtros o ciclos anteriores en Movimientos), manda el HTML; dile a Edzon la diferencia.

### Web

Sus pantallas `W-*` ya no están en `rediseno-movil.html`: viven en `rediseno-web.html` (`leer-w.mjs` lo lee si está en `docs/diseno/`). Si no está, usa el inventario y las guías, y pregunta a Edzon por el HTML.

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

- Inventario (solo web): busca la línea con `grep -n "^## 4[)]" docs/diseno/inventario-pantallas-web.md` (o `tgrep`) y lee desde ella hasta el siguiente `## `. Antes, lee §0 si tocas barra, tema o avisos.
- Guía: `docs/guias-pantallas/NN-*.md`, solo para estructura, archivos y backend. Describe la web: en móvil, la forma de los datos sirve y el resto no. Si choca con el HTML, gana el HTML.

## Pasos

1. Confirma la unidad con `/quipu-estado`. Rama nueva desde `master` al día. Móvil: `feature/quipu-<tema>`; web: `feat/<unidad>-<tema>`.
2. Si hay una pantalla parecida ya hecha (Inicio en móvil), léela y cópiala: mismo `ScrollView` e insets, `TAB_BAR_SPACE`, mismo estilo de título de sección.
3. Plan en 6 líneas: qué cambia, archivos, qué textos pone el HTML, qué queda fuera, cómo verás que funciona, y qué abstracciones o efectos propones y por qué cada uno hace falta (si no hay, pon «ninguno»).
4. Falta una query o mutación: `/quipu-backend` primero. Con datos de ejemplo, tipa el ejemplo con `FunctionReturnType` de la query real.
5. Código. Solo lo que dibuja el HTML. Textos literales. Sin estados para casos que no pasan. Mantén la lógica fuera de los componentes (funciones puras en un `.ts` aparte).
   - **Siempre:** `/ponytail` como forma de trabajar (¿hace falta este código? → ¿se puede con lo que ya existe? → mínimo), `/vercel-react-best-practices` (en móvil aplican las reglas de renders, estado y composición; ignora las de Next, servidor y bundle web) y `/frontend-ui-engineering` (accesibilidad y estados).
   - **Móvil, siempre:** `/expo-overview` una vez por sesión (es el router), `/uniwind` para estilos y `/expo-native-ui` para la pantalla.
   - **Cuando toque:** `/expo-router` (rutas, pestañas, hojas), `/expo-animation` (movimiento y gestos), `/expo-data-fetching` (al conectar Convex real: cargando, error, sin conexión), `/performance-optimization` (listas largas o algo lento: mide antes), `/vercel-composition-patterns` (un componente con props booleanas que se acumulan), `/expo-ui` (solo si el HTML pide un control nativo y la dependencia ya está instalada; si no, pregunta).
   - Una skill que propone una dependencia nueva no es permiso para instalarla.
6. `/code-simplification` sobre lo que escribiste, antes de revisar. Recuerda a Edzon que ejecute `/no-comments`.
7. Checks: la lista de `.agents/skills/verify-quipu/SKILL.md`. Formatea solo tus archivos: `pnpm exec oxfmt <archivos>`.
8. Comprobación en pantalla.
   - Móvil: no uses Playwright ni lances emuladores. Dile a Edzon qué recorrer en el dispositivo (el «Terminado» de la unidad, tema claro y oscuro, fuente grande y 360 dp de ancho) y anótalo en el PR como «pendiente de Edzon».
   - Web: si existe `apps/web/.env.local` con `VITE_CONVEX_URL`, corre `pnpm dev`, abre `http://localhost:3000` y recorre el «Terminado», también a 375 px. Si no existe, escribe en el PR «no verificado en navegador: falta `.env.local`».
9. `/quipu-revision` y luego `/quipu-cerrar-unidad`.
