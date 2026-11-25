import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, toCents } from "@quipu/backend/shared/budget";
import {
	choiceOfRule,
	type DueAdjustment,
	dueDateFor,
	MAX_DAYS_BEFORE_END,
	type RuleKind,
	ruleFromChoice,
} from "@quipu/backend/shared/commitments";
import { dayInMonth, formatWeekdayDay, isoDateSchema } from "@quipu/backend/shared/dates";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];
type Fields = Omit<FunctionArgs<typeof api.commitments.add>, "space">;

export const FREQUENCIES = ["monthly", "once"] as const satisfies readonly Item["frequency"][];
export const FREQUENCY_LABELS = ["Cada mes", "Una vez"] as const;

export const RULE_KINDS = [
	"day",
	"last",
	"beforeEnd",
	"mid",
] as const satisfies readonly RuleKind[];
export const RULE_LABELS = [
	"Un día fijo",
	"El último día del mes",
	"Días antes del fin",
	"En quincena (el 15)",
] as const;

export type CommitmentDraft = {
	name: string;
	amount: string;
	envelope: Fields["envelope"];
	frequency: Item["frequency"];
	ruleKind: RuleKind;
	/** The day of the month (1–31) or the days before the end (1–10), as typed in the web. */
	ruleAmount: string;
	/** The date of a one-off, "YYYY-MM-DD". */
	date: string;
};

export type DraftErrors = { name?: string; amount?: string; due?: string };

/** The form of the web: empty to add, the item's values to edit. */
export function initialDraft(
	item: Pick<Item, "name" | "amountCents" | "envelope" | "frequency" | "rule" | "dueDate"> | null,
): CommitmentDraft {
	if (!item) {
		return {
			name: "",
			amount: "",
			envelope: "needs",
			frequency: "monthly",
			ruleKind: "day",
			ruleAmount: "",
			date: "",
		};
	}
	const rule = item.rule ? choiceOfRule(item.rule) : { kind: "day" as const, amount: "" };
	return {
		name: item.name,
		amount: formatCents(item.amountCents),
		envelope: item.envelope,
		frequency: item.frequency,
		ruleKind: rule.kind,
		ruleAmount: rule.amount,
		date: item.frequency === "once" ? item.dueDate : "",
	};
}

/** The args of `commitments.add` and `update` without the space, or the errors of the web. */
export function commitmentFields(
	draft: CommitmentDraft,
): { ok: true; fields: Fields } | { ok: false; errors: DraftErrors } {
	const name = draft.name.trim();
	const amountCents = toCents(draft.amount);
	const rule = ruleFromChoice(draft.ruleKind, draft.ruleAmount);
	const schedule =
		draft.frequency === "monthly"
			? rule && { frequency: "monthly" as const, rule }
			: isoDateSchema.safeParse(draft.date).success
				? { frequency: "once" as const, dueDate: draft.date }
				: null;
	if (name && amountCents > 0 && schedule) {
		return { ok: true, fields: { name, amountCents, envelope: draft.envelope, schedule } };
	}
	return {
		ok: false,
		errors: {
			name: name ? undefined : "Ponle un nombre.",
			amount: amountCents > 0 ? undefined : "Escribe el monto de cada pago.",
			due: schedule ? undefined : "Elige la fecha de vencimiento.",
		},
	};
}

/** "Este mes vence el sáb 28 nov." under a monthly rule; null until the rule is complete. */
export function thisMonthLine(
	draft: Pick<CommitmentDraft, "ruleKind" | "ruleAmount">,
	adjustment: DueAdjustment | null,
	today: string,
): string | null {
	const rule = ruleFromChoice(draft.ruleKind, draft.ruleAmount);
	if (!rule) return null;
	return `Este mes vence el ${formatWeekdayDay(dueDateFor(rule, adjustment ?? undefined, today.slice(0, 7)))}.`;
}

const numbers = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

/** The list behind "Día del mes" (1–31) or "Días antes del fin" (1–10). */
export function ruleAmountOptions(kind: "day" | "beforeEnd") {
	return kind === "day"
		? numbers(31).map((day) => ({ value: String(day), label: `Día ${day}` }))
		: numbers(MAX_DAYS_BEFORE_END).map((days) => ({
				value: String(days),
				label: `${days} ${days === 1 ? "día" : "días"}`,
			}));
}

/** Every day of `month` ("2026-02" has 28), for "Este mes vence…". */
export function monthDayOptions(month: string) {
	const [year, monthNumber] = month.split("-").map(Number);
	const last = Number(dayInMonth(year, monthNumber - 1, "last").slice(8));
	return numbers(last).map((day) => ({ value: String(day), label: `Día ${day}` }));
}
