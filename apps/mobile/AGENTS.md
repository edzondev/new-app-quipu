# App móvil (Expo)

- Expo cambia en cada SDK. Antes de tocar una API de Expo, EAS o React Native, lee la versión de `expo` en `package.json` y su documentación en `https://docs.expo.dev/versions/v<major>.0.0/`. No respondas de memoria.
- Paquetes: `pnpm expo install <paquete>`, nunca `pnpm add`. Así se elige la versión compatible con el SDK.
- Diagnóstico de dependencias: `pnpm exec expo-doctor`.
- Rutas en `src/app/` (Expo Router). Lo que no es ruta va fuera de esa carpeta.
- No crees ni edites `android/` ni `ios/` a mano: son generadas. La configuración nativa va en `app.json` y en los config plugins.
- Expo Go solo trae sus módulos. Un módulo con código nativo necesita build de desarrollo: `pnpm --filter mobile android`.
- Sin dependencias nuevas sin permiso de Edzon, aunque una skill de Expo la proponga.
