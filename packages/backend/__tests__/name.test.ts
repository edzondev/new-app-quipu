import { expect, test } from "vitest";
import { nameSchema } from "../shared/name";

test("the name is trimmed and must have 1 to 40 characters", () => {
	expect(nameSchema.parse("  Ana Paz ")).toBe("Ana Paz");
	expect(nameSchema.parse("x".repeat(40))).toBe("x".repeat(40));
	for (const bad of ["", "   ", "x".repeat(41)]) {
		expect(nameSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
	}
});
