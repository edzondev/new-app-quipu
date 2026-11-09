import { describe, expect, it } from "vitest";
import { extractCode, safeRedirect } from "../shared/household";

describe("extractCode", () => {
	it("keeps a bare code, upper-cased", () => {
		expect(extractCode("k7q2mx")).toBe("K7Q2MX");
	});

	it("ignores spaces around and inside the code", () => {
		expect(extractCode("  k7q 2mx ")).toBe("K7Q2MX");
	});

	it("keeps only the code of a pasted link", () => {
		expect(extractCode("https://quipu.app/unirme/k7q2mx")).toBe("K7Q2MX");
		expect(extractCode("https://quipu.app/unirme/K7Q2MX/")).toBe("K7Q2MX");
		expect(extractCode("https://quipu.app/unirme/K7Q2MX?utm=x#top")).toBe("K7Q2MX");
		expect(extractCode("/unirme/k7q 2mx")).toBe("K7Q2MX");
	});

	it("does not cut a longer code, so it can be reported as unknown", () => {
		expect(extractCode("K7Q2MXZ")).toBe("K7Q2MXZ");
	});

	it("gives an empty code for empty input", () => {
		expect(extractCode("   ")).toBe("");
	});
});

describe("safeRedirect", () => {
	it("accepts internal paths", () => {
		expect(safeRedirect("/unirme/K7Q2MX")).toBe("/unirme/K7Q2MX");
		expect(safeRedirect("/home?space=household")).toBe("/home?space=household");
	});

	it("sends anything else to Inicio", () => {
		for (const value of [
			"//evil.com",
			"/\\evil.com",
			"https://evil.com",
			"evil",
			"",
			undefined,
			3,
		]) {
			expect(safeRedirect(value)).toBe("/home");
		}
	});
});
