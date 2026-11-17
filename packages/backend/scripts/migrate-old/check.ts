import { normalizeEmail } from "../../shared/email.ts";
import { goalTarget, groupBy, type ImportRow, type OldExport } from "./convert.ts";

export type Difference = "missing" | "envelopes" | "fund" | "goals" | "expenses" | "incomes";

export type CheckResult = { checked: number; differences: Record<Difference, number> };

type Balances = {
	envelopes: number[];
	fund: number;
	goals: number[];
	expenses: number;
	incomes: number;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const sorted = (values: number[]) => [...values].sort((a, b) => a - b);

function carried(old: OldExport, cycleId: string) {
	return sum(
		old.envelopes
			.filter((envelope) => envelope.cycleId === cycleId)
			.map((envelope) => envelope.carriedOverCents ?? 0),
	);
}

/** What a person has in the old app, read straight from its tables. */
function oldBalances(old: OldExport, profileId: string): Balances {
	const cycles = old.financialCycles.filter((cycle) => cycle.profileId === profileId);
	const cycleIds = new Set(cycles.map((cycle) => cycle._id));
	const active = cycles.find((cycle) => cycle.status === "active");
	const envelopes = old.envelopes.filter((envelope) => envelope.cycleId === active?._id);
	const spendable = new Set(
		old.envelopes.filter((envelope) => envelope.type !== "savings").map((envelope) => envelope._id),
	);
	const subEnvelopes = old.subEnvelopes.filter((sub) => sub.profileId === profileId);
	const remaining = (type: string) =>
		envelopes.find((envelope) => envelope.type === type)?.remainingAmount ?? 0;
	return {
		envelopes: [remaining("needs"), remaining("wants"), remaining("savings")],
		fund: subEnvelopes.find((sub) => sub.isSystemDefault)?.currentAmount ?? 0,
		goals: sorted(
			subEnvelopes
				.filter((sub) => !sub.isSystemDefault && goalTarget(sub) > 0)
				.map((sub) => sub.currentAmount),
		),
		expenses: sum(
			old.expenses
				.filter((expense) => cycleIds.has(expense.cycleId) && spendable.has(expense.envelopeId))
				.map((expense) => expense.amount),
		),
		// The starting balance of the opening cycle arrives as an income.
		incomes:
			sum(
				old.incomeEvents
					.filter((income) => cycleIds.has(income.cycleId))
					.map((income) => income.amount),
			) +
			sum(cycles.filter((cycle) => cycle.isOpeningCycle).map((cycle) => carried(old, cycle._id))),
	};
}

function newBalances(row: ImportRow): Balances {
	const rows = [...row.closed, ...(row.open ? [row.open] : [])].flatMap((cycle) => cycle.rows);
	const total = (kind: "expense" | "income") =>
		sum(rows.filter((item) => item.kind === kind).map((item) => item.amountCents));
	const open = row.open?.envelopes;
	return {
		envelopes: [open?.needsCents ?? 0, open?.wantsCents ?? 0, open?.savingsCents ?? 0],
		fund: row.fundCents,
		goals: sorted(row.goals.map((goal) => goal.savedCents)),
		expenses: total("expense"),
		incomes: total("income"),
	};
}

const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Compares, person by person, the balances of the old app with the ones in their converted row.
 * It only counts differences by kind: nobody is named and no amount is shown.
 */
export function check(old: OldExport, rows: ImportRow[]): CheckResult {
	const differences: Record<Difference, number> = {
		missing: 0,
		envelopes: 0,
		fund: 0,
		goals: 0,
		expenses: 0,
		incomes: 0,
	};
	const users = groupBy(old.users, (user) => normalizeEmail(user.email));
	const profiles = new Map(old.profiles.map((profile) => [profile.userId, profile]));
	const withData = rows.filter((row) => row.open);
	for (const row of withData) {
		const user = users.get(row.email)?.[0];
		const profile = user && profiles.get(user._id);
		if (!profile) {
			differences.missing += 1;
			continue;
		}
		const before = oldBalances(old, profile._id);
		const after = newBalances(row);
		if (!same(before.envelopes, after.envelopes)) differences.envelopes += 1;
		if (before.fund !== after.fund) differences.fund += 1;
		if (!same(before.goals, after.goals)) differences.goals += 1;
		if (before.expenses !== after.expenses) differences.expenses += 1;
		if (before.incomes !== after.incomes) differences.incomes += 1;
	}
	return { checked: withData.length, differences };
}

export function isClean(result: CheckResult) {
	return Object.values(result.differences).every((count) => count === 0);
}
