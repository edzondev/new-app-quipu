---
paths:
  - "apps/web/src/routes/**"
---

# Rutas web (TanStack Router)

1. **El loader precarga con el query client del contexto.** `context.queryClient.ensureQueryData(convexQuery(api.x.y, args))`. Dos o más lecturas van en `Promise.all`.
   - Bueno: `routes/_app/home.tsx:7-11`. En paralelo: `routes/_app/movements.tsx:7-13`.
   - Malo: una server function en cada navegación. Antes de `36ce768`, `_app.tsx` línea 15 hacía `await getMyProfile()` y las rutas no tenían loader. Cada clic esperaba dos viajes al servidor (`git show 36ce768^:apps/web/src/routes/_app.tsx`).
2. **`space` y `today` vienen del contexto.** `_app.beforeLoad` los calcula y los devuelve (`_app.tsx:25-29`). Los loaders hijos los leen de `context`.
   - Bueno: `routes/_app/movements.tsx:8`.
3. **`?space=household` vive en la URL.** Solo `household` se escribe: Personal es el valor por defecto, sin parámetro (`_app.tsx:10-12`). `retainSearchParams(["space"])` lo conserva al navegar (`:13-15`). Sin hogar, se redirige quitándolo (`:22-24`).
4. **`beforeLoad` decide sesión, plan y ciclo abierto, en este orden.** Sesión (`_app.tsx:17`), perfil con plan (`:18-21`), espacio válido (`:22-24`), `ensureOpenCycle` (`:27-28`). `ensureOpenCycle` va antes de cualquier loader hijo, porque las queries leen `requireOpenCycle`.
5. **La ruta solo conecta.** Loader más el componente de `modules/<pantalla>`. Sin JSX de pantalla ni lógica en el archivo de ruta.
   - Bueno: `routes/_app/home.tsx:12`.
6. **`routeTree.gen.ts` es generado.** Lo escribe `pnpm --filter web generate-routes`. No se edita a mano. Si `git diff --stat` sale vacío, solo cambió el fin de línea: no lo incluyas en el PR.
