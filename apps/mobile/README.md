# Quipu mobile

Desde la raíz: `pnpm --filter mobile start`, `pnpm --filter mobile ios` o `pnpm --filter mobile android`.

## Variables de entorno

Van en `apps/mobile/.env.local` (no se versiona). Se incrustan al empaquetar, así que hay que reiniciar `start` al cambiarlas:

- `EXPO_PUBLIC_CONVEX_URL`: URL `.convex.cloud` del deployment (queries y mutaciones).
- `EXPO_PUBLIC_CONVEX_SITE_URL`: URL `.convex.site` del mismo deployment (Better Auth).
