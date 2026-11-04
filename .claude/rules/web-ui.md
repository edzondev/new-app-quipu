---
paths:
  - "apps/web/src/components/**"
  - "apps/web/src/modules/**"
---

# UI web

1. **Piezas de coss primero.** Usa `components/ui/*`. Si falta una, instálala del registro `@coss` (`components.json`). Si trae una dependencia nueva, pide permiso.
   - Bueno: `register-form.tsx:9-18` usa `Button`, `Dialog*` e `Input` de `ui`.
2. **Tailwind con tokens, nunca rojo.** Colores de `styles.css` (`bg-muted`, `warning`). El riesgo va en ámbar (inventario §0.2.13).
   - Bueno: `home-page.tsx:103-110` (`bg-warning/16 text-warning-foreground`).
3. **Textos literales del diseño.** Cópialos de `node .claude/skills/quipu-pantalla/leer-w.mjs W-Inicio`. No los parafrasees.
   - Bueno: `home-page.tsx:89-91` («Puedes gastar hoy» y «Pueden gastar hoy juntos»).
   - Malo: `home-page.tsx:114` dice «Sobres» y W-Inicio dice «Tus sobres» con «Editar reparto». `register-form.tsx:136` dice «Queda en el ciclo de hoy.» y W-Registrar dice «En Personal».
4. **Toques de 44 px.** Chips, segmentos, botón de cerrar y enlaces de la barra (inventario §0.5).
   - Bueno: `movements-page.tsx:109` y `register-form.tsx:55` (`min-h-11`).
   - Malo: `app-bar.tsx:15` (pastillas de 30 px) y `:59` (enlaces de 36 px).
5. **Texto largo y montos grandes.** Fila con texto libre: contenedor `min-w-0`, texto `truncate`, monto `shrink-0 tabular-nums`. La nota llega a 40 caracteres (`shared/budget.ts:26`). Un monto de 4 cifras cabe en 375 px.
   - Bueno: `movement-row.tsx:40-45`.
   - Malo: `home-page.tsx:92-98`: el número de 72 px va en un `flex` sin `min-w-0` ni tamaño fluido. Con S/ 1,333.33 empuja el botón «i» fuera (L2, calculado, no medido).
6. **Efectos con razón.** Antes de un `useEffect`, mira si basta derivar el dato o cambiar la `key`.
   - Bueno: `home-page.tsx:28-32`: al cambiar el día en Lima, `key={today}` remonta la pantalla. No hay efecto.
7. **Dinero y estados.** `formatCents` solo al pintar (`home-page.tsx:84`). Carga con `Skeleton` y `role="status"` (`:57-70`), error con `role="alert"` (`:42-48`). No agregues más estados que los del HTML.
