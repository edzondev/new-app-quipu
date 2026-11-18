import { describe, expect, test } from "vitest";
import { cycleStepSchema, todayStepSchema } from "../shared/onboarding-schemas";
import { type Cadence, isValidStartDay, parseStartDay } from "../shared/plan";
import {
	DEFAULT_START_DAY,
	describeCycleChange,
	describePayday,
	getStartDayOptions,
	resolveCycle,
} from "../shared/start-day";

describe("getStartDayOptions", () => {
	test("monthly offers day 1 to 31 and the end of the month", () => {
		const options = getStartDayOptions("monthly");
		expect(options).toHaveLength(32);
		expect(options[0]).toEqual({ value: "1", label: "Día 1" });
		expect(options[30]).toEqual({ value: "31", label: "Día 31" });
		expect(options[31]).toEqual({ value: "last", label: "Fin de mes" });
	});

	test("biweekly offers day 1 to 14 and 15 y fin de mes", () => {
		const options = getStartDayOptions("biweekly");
		expect(options).toHaveLength(15);
		expect(options[13]).toEqual({ value: "14", label: "Día 14" });
		expect(options[14]).toEqual({ value: "last", label: "15 y fin de mes" });
	});

	test("a saved biweekly day the list does not offer stays selectable, before 15 y fin de mes", () => {
		const options = getStartDayOptions("biweekly", "20");
		expect(options).toHaveLength(16);
		expect(options[14]).toEqual({ value: "20", label: "Día 20" });
		expect(options[15].value).toBe("last");
	});

	test("a saved day the list offers adds nothing", () => {
		expect(getStartDayOptions("biweekly", "14")).toHaveLength(15);
		expect(getStartDayOptions("biweekly", "last")).toHaveLength(15);
		expect(getStartDayOptions("monthly", "31")).toHaveLength(32);
	});

	test("weekly goes from Monday to Sunday", () => {
		const options = getStartDayOptions("weekly");
		expect(options.map((option) => option.label)).toEqual([
			"Lunes",
			"Martes",
			"Miércoles",
			"Jueves",
			"Viernes",
			"Sábado",
			"Domingo",
		]);
		expect(options[4].value).toBe("5");
		expect(options[6].value).toBe("0");
	});

	test.each(["monthly", "biweekly", "weekly"] as const satisfies Cadence[])(
		"the default for %s is one of its options and a valid start day",
		(cadence) => {
			const values = getStartDayOptions(cadence).map((option) => option.value);
			expect(values).toContain(DEFAULT_START_DAY[cadence]);
			expect(isValidStartDay(cadence, parseStartDay(DEFAULT_START_DAY[cadence]))).toBe(true);
		},
	);

	test("every option is a valid start day for its cadence", () => {
		for (const cadence of ["monthly", "biweekly", "weekly"] as const) {
			for (const { value } of getStartDayOptions(cadence)) {
				expect(isValidStartDay(cadence, parseStartDay(value))).toBe(true);
			}
		}
	});
});

describe("describePayday", () => {
	test("biweekly names the 15th and the end of the month, or the day and 15 days after", () => {
		expect(describePayday("biweekly", "last")).toBe("Te pagan el 15 y a fin de mes.");
		expect(describePayday("biweekly", 3)).toBe("Te pagan el 3 y el 18.");
	});

	test("monthly says the end of the month or the day", () => {
		expect(describePayday("monthly", "last")).toBe("Te pagan a fin de mes.");
		expect(describePayday("monthly", 10)).toBe("Te pagan el día 10.");
	});

	test("weekly names the weekday", () => {
		expect(describePayday("weekly", 5)).toBe("Te pagan cada viernes.");
	});

	test("without a fixed pay it says how the plan is made", () => {
		expect(describePayday("variable", 1)).toBe("Planeamos por mes, del 1 a fin de mes.");
	});
});

describe("describeCycleChange", () => {
	test("tells when the open cycle closes, the next one and the pay days", () => {
		expect(describeCycleChange({ cadence: "biweekly", cycleStartDay: "last" }, "2026-10-31")).toBe(
			"Tu ciclo actual cierra el 31 oct. El siguiente va del 1 al 14 nov. Desde ahí, te pagan el 15 y a fin de mes.",
		);
	});

	test("a short stretch joins the next period, so the next cycle crosses months", () => {
		expect(describeCycleChange({ cadence: "monthly", cycleStartDay: 15 }, "2026-10-31")).toBe(
			"Tu ciclo actual cierra el 31 oct. El siguiente va del 1 nov al 14 dic. Desde ahí, te pagan el día 15.",
		);
	});

	test("weekly names the weekday", () => {
		expect(describeCycleChange({ cadence: "weekly", cycleStartDay: 5 }, "2026-10-29")).toBe(
			"Tu ciclo actual cierra el 29 oct. El siguiente va del 30 oct al 5 nov. Desde ahí, te pagan cada viernes.",
		);
	});
});

describe("resolveCycle", () => {
	test("no fixed pay is saved as monthly from day 1, whatever day was left in the form", () => {
		expect(resolveCycle("variable", "5")).toEqual({ cadence: "monthly", cycleStartDay: 1 });
	});

	test("a frequency keeps its day", () => {
		expect(resolveCycle("biweekly", "last")).toEqual({
			cadence: "biweekly",
			cycleStartDay: "last",
		});
		expect(resolveCycle("weekly", "5")).toEqual({ cadence: "weekly", cycleStartDay: 5 });
	});
});

describe("cycleStepSchema", () => {
	const chosen = { frequency: "monthly", startDay: "last", cycleIncome: "" };

	test("nothing picked does not pass", () => {
		expect(cycleStepSchema.safeParse({ ...chosen, frequency: "" }).success).toBe(false);
	});

	test("each frequency with its default day passes", () => {
		for (const frequency of ["monthly", "biweekly", "weekly", "variable"] as const) {
			const startDay = DEFAULT_START_DAY[frequency];
			expect(cycleStepSchema.safeParse({ ...chosen, frequency, startDay }).success).toBe(true);
		}
	});

	test("a day outside the cadence does not pass", () => {
		expect(
			cycleStepSchema.safeParse({ ...chosen, frequency: "weekly", startDay: "9" }).success,
		).toBe(false);
	});

	test("income is optional but must be positive when typed", () => {
		expect(cycleStepSchema.safeParse({ ...chosen, cycleIncome: "0" }).success).toBe(false);
		expect(cycleStepSchema.safeParse({ ...chosen, cycleIncome: "1500" }).success).toBe(true);
	});
});

describe("todayStepSchema", () => {
	test("needs a typed amount", () => {
		expect(todayStepSchema.safeParse({ todayAmount: "" }).success).toBe(false);
		expect(todayStepSchema.safeParse({ todayAmount: "0" }).success).toBe(true);
	});
});
