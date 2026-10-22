import * as z from "zod/mini";

export const email = z.pipe(z.string().check(z.trim(), z.toLowerCase()), z.email());
export type Email = z.infer<typeof email>;

export const name = z.pipe(z.string().check(z.trim()), z.string().check(z.minLength(1)));
export type Name = z.infer<typeof name>;

export const salaryInCents = z.int().check(z.minimum(0));
export type SalaryInCents = z.infer<typeof salaryInCents>;

export const payday = z.int().check(z.minimum(1), z.maximum(31));
export type Payday = z.infer<typeof payday>;

export const waitSeconds = z.coerce.number();
export type WaitSeconds = z.infer<typeof waitSeconds>;

export const timestampMs = z.pipe(
	z.union([
		z.number(),
		z.pipe(
			z.string(),
			z.transform((text) => new Date(text).getTime()),
		),
		z.pipe(
			z.date(),
			z.transform((date) => date.getTime()),
		),
	]),
	z.number(),
);
export type TimestampMs = z.infer<typeof timestampMs>;

export const phase = z.union([
	z.literal("details"),
	z.literal("code"),
	z.literal("passkey"),
	z.literal("already-existed"),
]);
export type Phase = z.infer<typeof phase>;

export const draft = z.object({
	name: z.string(),
	email: z.string(),
	phase,
	waitUntil: z.nullable(z.number()),
});
export type Draft = z.infer<typeof draft>;

const readPhase = z.catch(
	z.union([z.literal("details"), z.literal("code"), z.literal("passkey")]),
	"details",
);

export function createAccountDraftSchema(now: number) {
	return z.object({
		name: z.catch(z.string(), ""),
		email: z.catch(z.string(), ""),
		phase: readPhase,
		waitUntil: z.catch(z.nullable(z.number().check(z.gt(now))), null),
	});
}
