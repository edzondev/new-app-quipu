import { describe, expect, it } from "vitest";
import {
	type CommitmentDraft,
	commitmentFields,
	initialDraft,
	monthDayOptions,
	ruleAmountOptions,
	thisMonthLine,
} from "./commitment-form";

const monthly: CommitmentDraft = {
	name: "Luz",
	amount: "64.00",
	envelope: "needs",
	frequency: "monthly",
	ruleKind: "day",
	ruleAmount: "28",
	date: "",
};
const once: CommitmentDraft = { ...monthly, name: "SOAT", frequency: "once", date: "2026-11-20" };

describe("commitmentFields", () => {
	it("sends a monthly on a fixed day with its amount in cents", () => {
		expect(commitmentFields(monthly)).toEqual({
			ok: true,
			fields: {
				name: "Luz",
				amountCents: 6_400,
				envelope: "needs",
				schedule: { frequency: "monthly", rule: { kind: "day", day: 28 } },
			},
		});
	});

	it("sends each of the web's four rules", () => {
		const rule = (ruleKind: CommitmentDraft["ruleKind"], ruleAmount: string) => {
			const result = commitmentFields({ ...monthly, ruleKind, ruleAmount });
			return result.ok && result.fields.schedule;
		};
		expect(rule("day", "31")).toEqual({ frequency: "monthly", rule: { kind: "day", day: 31 } });
		expect(rule("last", "")).toEqual({ frequency: "monthly", rule: { kind: "last" } });
		expect(rule("beforeEnd", "10")).toEqual({
			frequency: "monthly",
			rule: { kind: "beforeEnd", days: 10 },
		});
		expect(rule("mid", "")).toEqual({ frequency: "monthly", rule: { kind: "mid" } });
	});

	it("asks for the date when the day or the days before the end are out of range or missing", () => {
		const due = (ruleKind: CommitmentDraft["ruleKind"], ruleAmount: string) => {
			const result = commitmentFields({ ...monthly, ruleKind, ruleAmount });
			return result.ok ? null : result.errors.due;
		};
		expect(due("day", "")).toBe("Elige la fecha de vencimiento.");
		expect(due("day", "32")).toBe("Elige la fecha de vencimiento.");
		expect(due("beforeEnd", "11")).toBe("Elige la fecha de vencimiento.");
		expect(due("beforeEnd", "0")).toBe("Elige la fecha de vencimiento.");
	});

	it("sends a one-off with its date, and asks for one without it", () => {
		const result = commitmentFields(once);
		expect(result.ok && result.fields.schedule).toEqual({
			frequency: "once",
			dueDate: "2026-11-20",
		});
		expect(commitmentFields({ ...once, date: "" })).toEqual({
			ok: false,
			errors: { due: "Elige la fecha de vencimiento." },
		});
	});

	it("trims the name and asks for one when it is blank", () => {
		const result = commitmentFields({ ...monthly, name: "  Agua  " });
		expect(result.ok && result.fields.name).toBe("Agua");
		expect(commitmentFields({ ...monthly, name: "   " })).toEqual({
			ok: false,
			errors: { name: "Ponle un nombre." },
		});
	});

	it("asks for the amount at 0 and takes a cent and thousands with a comma", () => {
		const amount = (value: string) => {
			const result = commitmentFields({ ...monthly, amount: value });
			return result.ok ? result.fields.amountCents : result.errors.amount;
		};
		expect(amount("0")).toBe("Escribe el monto de cada pago.");
		expect(amount("")).toBe("Escribe el monto de cada pago.");
		expect(amount("0.01")).toBe(1);
		expect(amount("1,890.00")).toBe(189_000);
		expect(amount("12,50")).toBe(1_250);
	});

	it("gives every error at once on an empty form", () => {
		expect(commitmentFields(initialDraft(null))).toEqual({
			ok: false,
			errors: {
				name: "Ponle un nombre.",
				amount: "Escribe el monto de cada pago.",
				due: "Elige la fecha de vencimiento.",
			},
		});
	});
});

describe("initialDraft", () => {
	it("fills an edit with the item, and its rule as the web's choice", () => {
		expect(
			initialDraft({
				name: "Préstamo",
				amountCents: 189_000,
				envelope: "wants",
				frequency: "monthly",
				rule: { kind: "beforeEnd", days: 3 },
				dueDate: "2026-11-27",
			}),
		).toEqual({
			name: "Préstamo",
			amount: "1,890.00",
			envelope: "wants",
			frequency: "monthly",
			ruleKind: "beforeEnd",
			ruleAmount: "3",
			date: "",
		});
	});

	it("keeps the date of a one-off, which round-trips unchanged", () => {
		const draft = initialDraft({
			name: "SOAT",
			amountCents: 9_500,
			envelope: "needs",
			frequency: "once",
			rule: null,
			dueDate: "2026-11-20",
		});
		expect(draft.date).toBe("2026-11-20");
		expect(commitmentFields(draft).ok).toBe(true);
	});

	it("keeps a «último día» rule from the web when editing", () => {
		const draft = initialDraft({
			name: "Agua",
			amountCents: 4_000,
			envelope: "needs",
			frequency: "monthly",
			rule: { kind: "last" },
			dueDate: "2026-11-30",
		});
		const result = commitmentFields(draft);
		expect(result.ok && result.fields.schedule).toEqual({
			frequency: "monthly",
			rule: { kind: "last" },
		});
	});
});

describe("thisMonthLine", () => {
	it("says this month's date of the rule", () => {
		expect(thisMonthLine({ ruleKind: "day", ruleAmount: "28" }, null, "2026-11-25")).toBe(
			"Este mes vence el sáb 28 nov.",
		);
	});

	it("moves a day 31 to the last day of a short month", () => {
		expect(thisMonthLine({ ruleKind: "day", ruleAmount: "31" }, null, "2026-11-25")).toBe(
			"Este mes vence el lun 30 nov.",
		);
	});

	it("follows this month's change by hand", () => {
		expect(
			thisMonthLine(
				{ ruleKind: "day", ruleAmount: "28" },
				{ month: "2026-11", day: 27 },
				"2026-11-25",
			),
		).toBe("Este mes vence el vie 27 nov.");
	});

	it("is null until the rule is complete", () => {
		expect(thisMonthLine({ ruleKind: "day", ruleAmount: "" }, null, "2026-11-25")).toBeNull();
	});
});

describe("options", () => {
	it("lists 31 days, and 1 to 10 days before the end", () => {
		const days = ruleAmountOptions("day");
		expect(days).toHaveLength(31);
		expect(days[30]).toEqual({ value: "31", label: "Día 31" });
		const before = ruleAmountOptions("beforeEnd");
		expect(before).toHaveLength(10);
		expect(before[0]).toEqual({ value: "1", label: "1 día" });
		expect(before[9]).toEqual({ value: "10", label: "10 días" });
	});

	it("lists only the days the month has", () => {
		expect(monthDayOptions("2026-02")).toHaveLength(28);
		expect(monthDayOptions("2028-02")).toHaveLength(29);
		expect(monthDayOptions("2026-12")).toHaveLength(31);
	});
});
