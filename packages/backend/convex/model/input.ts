import { ConvexError } from "convex/values";
import type * as z from "zod/mini";

export const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";

/** The one place a failed field check becomes the user-facing error. */
export function parseInput<S extends z.ZodMiniType>(schema: S, value: z.input<S>): z.output<S> {
	const result = schema.safeParse(value);
	if (!result.success) throw new ConvexError(BAD_INPUT);
	return result.data;
}
