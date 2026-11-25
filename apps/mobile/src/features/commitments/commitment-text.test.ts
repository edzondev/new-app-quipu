import { describe, expect, it } from "vitest";
import { backToRuleLabel, dueLine, payHeading, payLabel } from "./commitment-text";

describe("payLabel", () => {
	it("offers to pay what is overdue, upcoming or reserved, like the web", () => {
		expect(payLabel({ status: "overdue", frequency: "monthly" })).toBe("Vencido · marcar pagado");
		expect(payLabel({ status: "upcoming", frequency: "monthly" })).toBe("Marcar pagado");
		expect(payLabel({ status: "reserved", frequency: "monthly" })).toBe("Marcar pagado");
	});

	it("lets a one-off of «Más adelante» be paid ahead, but not a monthly", () => {
		expect(payLabel({ status: "later", frequency: "once" })).toBe("Marcar pagado");
		expect(payLabel({ status: "later", frequency: "monthly" })).toBeNull();
	});

	it("offers nothing for what is paid", () => {
		expect(payLabel({ status: "paid", frequency: "once" })).toBeNull();
		expect(payLabel({ status: "paid", frequency: "monthly" })).toBeNull();
	});
});

describe("dueLine", () => {
	const luz = { envelope: "needs", frequency: "monthly" } as const;

	it("says «Mañana» across the end of the month", () => {
		expect(dueLine({ ...luz, dueDate: "2026-12-01" }, "upcoming", "2026-11-30")).toBe(
			"Mañana · Necesidades · cada mes",
		);
	});

	it("says «Hoy» on the day and the day of the month after it", () => {
		expect(dueLine({ ...luz, dueDate: "2026-11-25" }, "upcoming", "2026-11-25")).toBe(
			"Hoy · Necesidades · cada mes",
		);
		expect(dueLine({ ...luz, dueDate: "2026-11-28" }, "reserved", "2026-11-25")).toBe(
			"Día 28 · Necesidades · cada mes",
		);
	});

	it("gives a one-off its date, and something paid today no «Hoy»", () => {
		expect(
			dueLine(
				{ envelope: "wants", frequency: "once", dueDate: "2026-11-20" },
				"reserved",
				"2026-11-13",
			),
		).toBe("20 nov · Gustos · una vez");
		expect(dueLine({ ...luz, dueDate: "2026-11-25" }, "paid", "2026-11-25")).toBe(
			"Día 25 · Necesidades · cada mes",
		);
	});
});

describe("payHeading", () => {
	it("says «vencía» for a past date and «vence» from today on", () => {
		expect(payHeading({ name: "Luz", dueDate: "2026-10-28" }, "2026-11-02")).toBe(
			"Luz · vencía el 28 oct",
		);
		expect(payHeading({ name: "Luz", dueDate: "2026-11-02" }, "2026-11-02")).toBe(
			"Luz · vence el 2 nov",
		);
	});
});

describe("backToRuleLabel", () => {
	const rule = { kind: "day", day: 28 } as const;

	it("goes back to the rule's day when this month was moved", () => {
		expect(
			backToRuleLabel({ rule, adjustment: { month: "2026-11", day: 27 }, dueDate: "2026-11-27" }),
		).toBe("Volver al 28");
	});

	it("says nothing when the change belongs to another month or there is none", () => {
		expect(
			backToRuleLabel({ rule, adjustment: { month: "2026-10", day: 27 }, dueDate: "2026-11-28" }),
		).toBeNull();
		expect(backToRuleLabel({ rule, adjustment: null, dueDate: "2026-11-28" })).toBeNull();
		expect(backToRuleLabel({ rule: null, adjustment: null, dueDate: "2026-11-20" })).toBeNull();
	});
});
