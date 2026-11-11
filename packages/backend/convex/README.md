# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
	// Validators for arguments.
	args: {
		first: v.number(),
		second: v.string(),
	},

	// Function implementation.
	handler: async (ctx, args) => {
		// Read the database as many times as you need here.
		// See https://docs.convex.dev/database/reading-data.
		const documents = await ctx.db.query("tablename").collect();

		// Arguments passed from the client are properties of the args object.
		console.log(args.first, args.second);

		// Write arbitrary JavaScript here: filter, aggregate, build derived data,
		// remove non-public properties, or create new objects.
		return documents;
	},
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.myFunctions.myQueryFunction, {
	first: 10,
	second: "hello",
});
```

A mutation function looks like:

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
	// Validators for arguments.
	args: {
		first: v.string(),
		second: v.string(),
	},

	// Function implementation.
	handler: async (ctx, args) => {
		// Insert or modify documents in the database here.
		// Mutations can also read from the database like queries.
		// See https://docs.convex.dev/database/writing-data.
		const message = { body: args.first, author: args.second };
		const id = await ctx.db.insert("messages", message);

		// Optionally, return a value from your mutation.
		return await ctx.db.get("messages", id);
	},
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
	// fire and forget, the most common way to use mutations
	mutation({ first: "Hello!", second: "me" });
	// OR
	// use the result once the mutation has completed
	mutation({ first: "Hello!", second: "me" }).then((result) => console.log(result));
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

## Webhook de Polar (`/polar/events`)

- Firma mala: 403 y no se guarda nada.
- Evento ilegible (JSON roto, campos que no cuadran, `modified_at` que no es fecha, o un cliente cuyo `externalId` y `metadata.userId` nombran a personas distintas): se registra en el log con el `webhook-id` y el motivo, sin secretos ni datos de la persona, y se responde 202. Un 4xx haría que Polar reintente y, tras varios fallos, desactive el endpoint.
- No hay reintento automático. Para recuperarlo, corrige la causa y reenvía ese evento a mano desde Polar, buscándolo por el `webhook-id` del log.
- Eventos repetidos o fuera de orden no pisan uno más nuevo: `modifiedAt` se guarda en una sola forma ordenable (UTC, seis decimales) y se compara contra lo guardado antes de escribir.
