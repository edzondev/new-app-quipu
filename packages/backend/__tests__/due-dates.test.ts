import { expect, test } from "vitest";
import { getNextDueDate } from "../shared/commitments";

test("a monthly due on the 31st at a cycle ending 31 Oct is next due 30 Nov, not that same day", () => {
	expect(getNextDueDate({ frequency: "monthly", dueDay: 31 }, "2026-10-31")).toBe("2026-11-30");
});

test("a monthly due on the 1st at a cycle ending 31 Oct is next due 1 Nov, not a month later", () => {
	expect(getNextDueDate({ frequency: "monthly", dueDay: 1 }, "2026-10-31")).toBe("2026-11-01");
});

test("a one-off keeps its own date", () => {
	expect(getNextDueDate({ frequency: "once", dueDate: "2026-12-24" }, "2026-10-31")).toBe(
		"2026-12-24",
	);
});
