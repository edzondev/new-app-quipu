---
paths:
  - "apps/mobile/src/**"
---

# Móvil (Expo)

1. **La pantalla vive en su ruta; un archivo nuevo necesita una razón.** Cada archivo de `src/app/` es la pantalla entera, con todo lo que solo usa ella. `src/features/<módulo>/` guarda solo lo que tiene razón para ser otro archivo: lo usan 2 o más archivos, es la lógica pura del módulo (un `.ts` sin `react-native`, uno por módulo, el que prueba Vitest), o el archivo pasaría de unas 550 líneas. Nada de un archivo por constante, por subcomponente de un solo uso o por formulario. Los datos de ejemplo van en `sample.ts`, tipados con `FunctionReturnType<typeof api.x.y>`, hasta conectar la query real.
   - Bueno: `app/(tabs)/movements.tsx` (la pantalla y su `MovementRow`) con `features/movements/movement-rows.ts` (lógica pura que usan Movimientos, Registrar y Ahorros).
   - Bueno: `features/register/register-fields.tsx` existe porque con los campos dentro `app/register.tsx` pasaría de 550 líneas.
2. **Estilos con Uniwind y tokens de `global.css`.** `className` con cadenas completas (`bg-background`, `text-muted-foreground`, `bg-envelope-needs`). Nunca armes una clase con una variable (`bg-${x}`): usa un mapa. Sin hex ni `StyleSheet`. `style` solo para lo que se mide en ejecución (insets). Los colores que no son `style` (`color`, `tintColor`, `placeholderTextColor`) van con `colorClassName="accent-..."`; para un color en JS, `useThemeColor("--color-primary")`. Nunca envuelvas componentes de `react-native` con `withUniwind`. El riesgo va en ámbar (`warning`), nunca rojo.
   - Bueno: `ENVELOPE_DOT` (`lib/envelope-dot.ts`) mapea el sobre a su clase completa.
   - Bueno: `tab-bar.tsx` usa `useThemeColor` porque la sombra y el ícono necesitan el color como valor.
3. **Textos literales del diseño.** `node .claude/skills/quipu-pantalla/leer-w.mjs E1` (cualquier id del diseño; Android por defecto, `E1 ios` para iOS). No parafrasees.
4. **Toques de 44 px y accesibilidad.** Chips, segmentos, botones de cerrar y filas tocables: `min-h-11` o `hitSlop`. Cada `Pressable` lleva `accessibilityRole` y `accessibilityLabel` si no tiene texto.
   - Bueno: `components/ui/segmented.tsx` (`min-h-11` y `accessibilityLabel`); `button.tsx`.
5. **Texto largo, montos grandes y fuente del sistema.** Fila con texto libre: contenedor `min-w-0 flex-1`, texto con `numberOfLines={1}`, monto `shrink-0 font-mono`. Un monto de 4 cifras cabe en 360 dp. Con la fuente del sistema al máximo, nada se corta ni se encima.
   - Bueno: `MovementRow` en `app/(tabs)/movements.tsx`.
6. **Listas largas con `FlatList` o `SectionList`.** Nunca `.map` dentro de un `ScrollView` si la lista puede pasar de unas 20 filas. `keyExtractor` con el `id`. La fila es un componente aparte.
   - Bueno: `app/(tabs)/movements.tsx` (hasta 500 filas).
   - `.map` dentro de `ScrollView` vale para listas fijas y cortas: los 3 sobres de `Envelopes` en `app/(tabs)/index.tsx`.
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
15. **Tests solo de lógica pura, con Vitest** (`pnpm --filter mobile test`). El archivo que se prueba no importa `react-native`, `expo-*` ni componentes: si lo hace, saca la función pura a la lógica pura del módulo. Los tests van en `src/__tests__/`, uno por archivo probado y con su nombre. Sin jest, sin tests de componentes y sin mocks de Convex. Lo que se ve en pantalla lo prueba Edzon en el dispositivo.

- Bueno: `features/register/register.ts` con `src/__tests__/register.test.ts` (la línea «Hoy te pasarás», un gasto de un día anterior).

16. **Datos con React Query sobre Convex** (`lib/query-client.ts`, mismo cliente que la sesión). Se lee con `useQuery(convexQuery(api.x.y, args))`; una pantalla que carga datos usa `useSuspenseQueries({ queries: [queryOptions(convexQuery(...))] })` dentro de `<LoadBoundary message fallback>` (cargando y error, sin `if (!data)`); se escribe con `useMutation`. `convex/react` solo queda para la sesión (`useConvexAuth`). Sin helpers propios sobre la librería: lo que falta se resuelve con su API o su documentación.

- **`useEnsureOpen(space, today)`** abre el ciclo una vez por espacio y día (queda en caché). Lo llama la pantalla que lee el ciclo; **una hoja o una pantalla completa encima nunca lo llama**: lee el caché que la pantalla de abajo ya llenó, con las mismas claves.
- Bueno: `app/(tabs)/movements.tsx` (`useEnsureOpen` y `useSuspenseQueries`) y `app/register.tsx` (`useQuery`, sin esperar).
- **Doble toque: `lib/use-single-flight.ts`.** Recibe el `mutateAsync` de un `useMutation` y descarta la segunda llamada mientras la primera corre (un `ref`; `isPending` llega tarde). Se permite porque no envuelve React Query: no cambia sus opciones, su caché ni su estado. Lo usan `useMovementActions` (en `app/register.tsx`) y `use-commitment-actions.ts`.
