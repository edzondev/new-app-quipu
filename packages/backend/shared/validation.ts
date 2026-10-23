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
