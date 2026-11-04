# Quipu

Finanzas personales en soles para Lima. Divide el dinero por ciclos en tres sobres (Necesidades, Gustos y Ahorro) y dice cuánto puedes gastar hoy.

- `apps/web`: la web (TanStack Start, desplegada en Cloudflare).
- `packages/backend`: Convex y la lógica del dinero.

## Empezar

Node >= 24 y pnpm 12.14.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` pide `apps/web/.env.local` con `VITE_CONVEX_URL` y un deployment de Convex con sus variables.

## Trabajar aquí

Comandos, reglas y flujo de trabajo: [AGENTS.md](AGENTS.md).
