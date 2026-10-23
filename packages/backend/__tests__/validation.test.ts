import { expect, test } from "vitest";
import { email, name, payday, salaryInCents, waitSeconds } from "../shared/validation";

test("email is trimmed, lowercased, and shaped like an email", () => {
	expect(email.parse("ana@correo.com")).toBe("ana@correo.com");
	expect(email.parse("  A@B.COM ")).toBe("a@b.com");
	expect(email.safeParse("").success).toBe(false);
	expect(email.safeParse("no-es-correo").success).toBe(false);
	expect(email.safeParse("a@b").success).toBe(false);
	expect(email.safeParse("a @b.com").success).toBe(false);
});

test("name is trimmed and non-empty", () => {
	expect(name.parse("Ana")).toBe("Ana");
	expect(name.parse("  Ana María  ")).toBe("Ana María");
	expect(name.safeParse("").success).toBe(false);
	expect(name.safeParse("   ").success).toBe(false);
});

test("salary in cents is an integer from zero", () => {
	expect(salaryInCents.parse(0)).toBe(0);
	expect(salaryInCents.parse(4230)).toBe(4230);
	expect(salaryInCents.safeParse(-1).success).toBe(false);
	expect(salaryInCents.safeParse(1.5).success).toBe(false);
	expect(salaryInCents.safeParse(12.75).success).toBe(false);
});

test("payday is an integer from 1 to 31", () => {
	expect(payday.parse(1)).toBe(1);
	expect(payday.parse(31)).toBe(31);
	expect(payday.safeParse(0).success).toBe(false);
	expect(payday.safeParse(32).success).toBe(false);
	expect(payday.safeParse(1.5).success).toBe(false);
});

test("wait seconds coerce to a finite number", () => {
	expect(waitSeconds.parse("65")).toBe(65);
	expect(waitSeconds.parse("0")).toBe(0);
	expect(waitSeconds.parse("  65  ")).toBe(65);
	expect(waitSeconds.parse("")).toBe(0);
	expect(waitSeconds.safeParse("abc").success).toBe(false);
	expect(waitSeconds.safeParse("Infinity").success).toBe(false);
	expect(waitSeconds.safeParse(undefined).success).toBe(false);
});
