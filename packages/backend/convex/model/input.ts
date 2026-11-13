import { ConvexError } from "convex/values";
import type * as z from "zod/mini";
import { MAX_MOVEMENT_CENTS, movementCentsSchema } from "../../shared/budget";

export const BAD_INPUT = "Revisa los datos e inténtalo otra vez.";
export const MOVEMENT_TOO_LARGE = "El monto máximo es S/ 1 000 000";

/** The one place a failed field check becomes the user-facing error. */
export function parseInput<S extends z.ZodMiniType>(schema: S, value: z.input<S>): z.output<S> {
	const result = schema.safeParse(value);
	if (!result.success) throw new ConvexError(BAD_INPUT);
	return result.data;
}

/** Positive cents for a movement, capped at S/ 1 000 000. */
export function parseMovementCents(amountCents: number) {
	const result = movementCentsSchema.safeParse(amountCents);
	if (result.success) return result.data;
	if (Number.isInteger(amountCents) && amountCents > MAX_MOVEMENT_CENTS) {
		throw new ConvexError(MOVEMENT_TOO_LARGE);
	}
	throw new ConvexError(BAD_INPUT);
}
