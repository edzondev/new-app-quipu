---
paths:
  - "apps/mobile/src/**"
---

# Móvil (Expo)

1. **Rutas finas, pantallas en `features/`.** `src/app/` solo conecta: layout, ruta y la pantalla de `src/features/<pantalla>/`. La lógica pura va en un `.ts` aparte y los datos de ejemplo en `sample.ts`, tipados con `FunctionReturnType<typeof api.x.y>` para que cambiarlos por la query real no toque la UI.
   - Bueno: `features/movements/rows.ts` (`groupByDay`, `movementText`, sin JSX) y `movement-row.tsx`, que solo pinta.
   - Bueno: `app/register.tsx` (la ruta lee el parámetro y monta `RegisterForm`).
2. **Estilos con Uniwind y tokens de `global.css`.** `className` con cadenas completas (`bg-background`, `text-muted-foreground`, `bg-envelope-needs`). Nunca armes una clase con una variable (`bg-${x}`): usa un mapa. Sin hex ni `StyleSheet`. `style` solo para lo que se mide en ejecución (insets). Los colores que no son `style` (`color`, `tintColor`, `placeholderTextColor`) van con `colorClassName="accent-..."`; para un color en JS, `useThemeColor("--color-primary")`. Nunca envuelvas componentes de `react-native` con `withUniwind`. El riesgo va en ámbar (`warning`), nunca rojo.
   - Bueno: `ENVELOPE_DOT` (`lib/envelope-dot.ts`) mapea el sobre a su clase completa.
   - Bueno: `tab-bar.tsx` usa `useThemeColor` porque la sombra y el ícono necesitan el color como valor.
3. **Textos literales del diseño.** `node .claude/skills/quipu-pantalla/leer-w.mjs E1` (cualquier id del diseño; Android por defecto, `E1 ios` para iOS). No parafrasees.
4. **Toques de 44 px y accesibilidad.** Chips, segmentos, botones de cerrar y filas tocables: `min-h-11` o `hitSlop`. Cada `Pressable` lleva `accessibilityRole` y `accessibilityLabel` si no tiene texto.
   - Bueno: `components/ui/segmented.tsx` (`min-h-11` y `accessibilityLabel`); `button.tsx`.
5. **Texto largo, montos grandes y fuente del sistema.** Fila con texto libre: contenedor `min-w-0 flex-1`, texto con `numberOfLines={1}`, monto `shrink-0 font-mono`. Un monto de 4 cifras cabe en 360 dp. Con la fuente del sistema al máximo, nada se corta ni se encima.
   - Bueno: `movement-row.tsx`.
6. **Listas largas con `FlatList` o `SectionList`.** Nunca `.map` dentro de un `ScrollView` si la lista puede pasar de unas 20 filas. `keyExtractor` con el `id`. La fila es un componente aparte.
   - Bueno: `app/(tabs)/movements.tsx` (hasta 500 filas).
   - `.map` dentro de `ScrollView` vale para listas fijas y cortas: los 3 sobres de `envelopes.tsx`.
7. **El React Compiler está activo** (`app.json`, `reactCompiler`). No escribas `useMemo`, `useCallback` ni `memo` por reflejo: solo si una medición lo pide, con el motivo en un comentario.
8. **Efectos con razón.** Antes de un `useEffect`, mira si basta derivar el dato, cambiar la `key` o usar un evento. Cada efecto limpia lo que abre (suscripciones, temporizadores).
   - Bueno: `app/register.tsx` usa `key` para rehacer el formulario, sin efecto.
9. **Márgenes seguros y barra flotante.** `useSafeAreaInsets` más `TAB_BAR_SPACE` abajo en cada pantalla de pestaña. Nada se esconde bajo la barra, el notch ni el teclado.
   - Bueno: `app/(tabs)/index.tsx`.
10. **Movimiento con Reanimated, en el hilo de UI.** Anima `transform` y `opacity`, no el layout con `setState`. Si el sistema pide menos movimiento, se respeta. Antes de animar, `/expo-animation`.
11. **Dinero y fechas.** Céntimos enteros; `formatCents` solo al pintar. Días con `shared/dates.ts` (`formatDayHeading`, `formatDaysLeft`): nunca `new Date()` para decidir el día. Con la app en segundo plano el día puede cambiar: se recalcula al volver, no se guarda en un estado.
12. **Estados solo los del diseño.** Con datos de ejemplo no hay cargando, error ni sin conexión (sección O del diseño). Entran el día que se conecta la query real, y con la forma de O1, O2 y O3.
13. **Sin dependencias nuevas sin permiso de Edzon.** Una skill de Expo que sugiere `expo-image`, `@expo/ui`, `expo-haptics` u otra no es permiso: pregunta. Se instala con `pnpm expo install`, nunca `pnpm add`. Íconos: `reicon-react-native`.
14. **El diseño de Mira manda sobre `expo-native-ui`.** De esa skill toma lo que no choca (rendimiento, insets, controles que el HTML pide). No su estética: ni SF Symbols, ni HIG de iOS, ni colores del sistema.
15. **Sin tests en móvil.** No hay runner y no se agrega. Lo compartido se prueba en el backend; el resto lo prueba Edzon en el dispositivo.
