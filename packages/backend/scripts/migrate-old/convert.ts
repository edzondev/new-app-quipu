import type { Infer } from "convex/values";
import type { migrationImport } from "../../convex/schema";
import { NAME_MAX_LENGTH, NOTE_MAX_LENGTH } from "../../shared/budget.ts";
import { normalizeEmail } from "../../shared/email.ts";
import { addDays, getLimaDate } from "../../shared/dates.ts";

export type ImportRow = Infer<typeof migrationImport>;
type ImportedCycle = NonNullable<ImportRow["open"]>;
type ImportedRow = ImportedCycle["rows"][number];
type Plan = NonNullable<ImportRow["plan"]>;

type EnvelopeType = "needs" | "wants" | "savings";

/** The tables of the old app that the conversion reads, as the export has them. Money is in cents. */
export type OldExport = {
	users: { _id: string; email: string; emailVerified: boolean }[];
	profiles: {
		_id: string;
		userId: string;
		name: string;
		currencyCode: string;
		incomeModel: "fixed" | "variable" | "mixed";
		cycleDurationDays?: number;
		mixedFixedAmount?: number;
		payFrequency?: "monthly" | "biweekly" | "weekly" | "variable";
		paydays?: number[];
		allocationNeeds: number;
		allocationWants: number;
		allocationSavings: number;
		plan: "free" | "premium";
		accountStatus?: "active" | "suspended" | "under_review";
	}[];
	financialCycles: {
		_id: string;
		profileId: string;
		startDate: number;
		status: "active" | "closed";
		isOpeningCycle?: boolean;
		unallocatedCents?: number;
		needsReview?: boolean;
		coverageBoost?: unknown;
	}[];
	envelopes: {
		_id: string;
		cycleId: string;
		type: EnvelopeType;
		remainingAmount: number;
		carriedOverCents?: number;
	}[];
	subEnvelopes: {
		profileId: string;
		label: string;
		currentAmount: number;
		targetAmount?: number;
		isSystemDefault: boolean;
	}[];
	fixedCommitments: {
		profileId: string;
		name: string;
		amount: number;
		envelope: "needs" | "wants";
		dueDay: number;
		nextDueAt?: number;
		paidForCycleId?: string;
	}[];
	expenses: {
		cycleId: string;
		envelopeId: string;
		subEnvelopeId?: string;
		amount: number;
		description: string;
		timestamp: number;
	}[];
	incomeEvents: {
		cycleId: string;
		amount: number;
		description: string;
		occurredAt: number;
		distributionApplied: Record<EnvelopeType, number>;
		incomeKind?: "habitual" | "extraordinary";
		extraordinaryType?: string;
		distributionPolicy?: "profile_default" | "all_to_savings";
		heldCents?: number;
	}[];
};

export type Profile = OldExport["profiles"][number];
type Cycle = OldExport["financialCycles"][number];
type Envelope = OldExport["envelopes"][number];

/** Why a person of the old app gets no row. Exported so tests can name each one. */
export type SkipReason =
	| "unverified"
	| "duplicateEmail"
	| "noProfile"
	| "notPen"
	| "suspended"
	| "activeCycles"
	| "cycleDates";

export type Conversion = {
	rows: ImportRow[];
	skipped: Record<SkipReason, number>;
	dropped: { savingsExpenses: number; emptyGoals: number };
};

// The claim writes a person's whole row inside the transaction of their sign-up. Convex's own limits
// on writes per transaction are not caught by the try/catch in onCreate, so stay well under them.
export const MAX_MOVEMENTS = 1000;
export const MAX_ROW_BYTES = 900_000;
const OPENING_NOTE = "Saldo inicial";

const EXTRA_TYPES: Record<
	string,
	NonNullable<Extract<ImportedRow, { kind: "income" }>["extraType"]>
> = {
	gratification_july: "gratification",
	gratification_december: "gratification",
	corporate_bonus: "bonus",
	profit_sharing: "bonus",
};

export function groupBy<T>(items: T[], key: (item: T) => string) {
	const groups = new Map<string, T[]>();
	for (const item of items) {
		const group = groups.get(key(item));
		if (group) group.push(item);
		else groups.set(key(item), [item]);
	}
	return groups;
}

function clip(text: string, max: number) {
	return text.trim().slice(0, max).trim();
}

function toNote(text: string) {
	return clip(text, NOTE_MAX_LENGTH) || undefined;
}

export function limaDay(ms: number) {
	return getLimaDate(new Date(ms));
}

/** Old goals worth bringing: the new app needs a target above zero, so what is saved stands in for a missing one. */
export function goalTarget(goal: OldExport["subEnvelopes"][number]) {
	return goal.targetAmount ?? goal.currentAmount;
}

type Lookup = {
	envelopesByCycle: Map<string, Envelope[]>;
	envelopeTypes: Map<string, EnvelopeType>;
	expensesByCycle: Map<string, OldExport["expenses"]>;
	incomesByCycle: Map<string, OldExport["incomeEvents"]>;
};

function amountOf(
	envelopes: Envelope[],
	type: EnvelopeType,
	field: "remainingAmount" | "carriedOverCents",
) {
	return envelopes.find((envelope) => envelope.type === type)?.[field] ?? 0;
}

function toRows(cycle: Cycle, lookup: Lookup, dropped: Conversion["dropped"]): ImportedRow[] {
	const timed: { at: number; row: ImportedRow }[] = [];
	for (const expense of lookup.expensesByCycle.get(cycle._id) ?? []) {
		const envelope = lookup.envelopeTypes.get(expense.envelopeId);
		// The new app never spends from Ahorro. The balances already include these, so only the row goes.
		if (envelope !== "needs" && envelope !== "wants") {
			dropped.savingsExpenses += 1;
			continue;
		}
		timed.push({
			at: expense.timestamp,
			row: {
				kind: "expense",
				amountCents: expense.amount,
				date: limaDay(expense.timestamp),
				envelope,
				note: toNote(expense.description),
			},
		});
	}
	for (const income of lookup.incomesByCycle.get(cycle._id) ?? []) {
		const extra = income.incomeKind === "extraordinary";
		timed.push({
			at: income.occurredAt,
			row: {
				kind: "income",
				amountCents: income.amount,
				date: limaDay(income.occurredAt),
				allocation: {
					needsCents: income.distributionApplied.needs,
					wantsCents: income.distributionApplied.wants,
					savingsCents: income.distributionApplied.savings,
				},
				extraType: extra ? (EXTRA_TYPES[income.extraordinaryType ?? ""] ?? "other") : undefined,
				toSavings: extra && income.distributionPolicy === "all_to_savings" ? true : undefined,
				note: toNote(income.description),
			},
		});
	}
	return timed.sort((a, b) => a.at - b.at).map(({ row }) => row);
}

/** The opening cycle of the old app held its starting balance as carry; here that balance is an income. */
function openingIncome(startDate: string, envelopes: Envelope[]): ImportedRow[] {
	const allocation = {
		needsCents: amountOf(envelopes, "needs", "carriedOverCents"),
		wantsCents: amountOf(envelopes, "wants", "carriedOverCents"),
		savingsCents: amountOf(envelopes, "savings", "carriedOverCents"),
	};
	const amountCents = allocation.needsCents + allocation.wantsCents + allocation.savingsCents;
	if (amountCents <= 0) return [];
	return [{ kind: "income", amountCents, date: startDate, allocation, note: OPENING_NOTE }];
}

function toCycle(cycle: Cycle, lookup: Lookup, dropped: Conversion["dropped"]): ImportedCycle {
	const envelopes = lookup.envelopesByCycle.get(cycle._id) ?? [];
	const startDate = limaDay(cycle.startDate);
	const opening = cycle.isOpeningCycle === true;
	return {
		startDate,
		envelopes: {
			needsCents: amountOf(envelopes, "needs", "remainingAmount"),
			wantsCents: amountOf(envelopes, "wants", "remainingAmount"),
			savingsCents: amountOf(envelopes, "savings", "remainingAmount"),
		},
		carryIn: {
			needsCents: opening ? 0 : amountOf(envelopes, "needs", "carriedOverCents"),
			wantsCents: opening ? 0 : amountOf(envelopes, "wants", "carriedOverCents"),
		},
		rows: [
			...(opening ? openingIncome(startDate, envelopes) : []),
			...toRows(cycle, lookup, dropped),
		],
	};
}

function toCadence(profile: Profile): Plan["cadence"] {
	if (profile.incomeModel === "variable") {
		return (profile.cycleDurationDays ?? 15) >= 30 ? "monthly" : "biweekly";
	}
	// A cycle of the old app without a frequency lasted 15 days.
	return profile.payFrequency === "monthly" || profile.payFrequency === "weekly"
		? profile.payFrequency
		: "biweekly";
}

function toStartDay(profile: Profile, cadence: Plan["cadence"], activeStart: string) {
	if (cadence === "weekly") return new Date(`${activeStart}T00:00:00Z`).getUTCDay();
	const paydays = (profile.paydays ?? []).filter(
		(day) => Number.isInteger(day) && day >= 1 && day <= 31,
	);
	return paydays.length > 0 ? Math.min(...paydays) : Number(activeStart.slice(8));
}

/** The usual income only suggests an amount on payday: the fixed part, or the last regular income. */
function toIncomeCents(profile: Profile, incomes: OldExport["incomeEvents"]) {
	if (profile.incomeModel === "mixed") return profile.mixedFixedAmount || undefined;
	if (profile.incomeModel !== "fixed") return undefined;
	const regular = incomes
		.filter((income) => income.incomeKind !== "extraordinary")
		.sort((a, b) => b.occurredAt - a.occurredAt);
	return regular[0]?.amount;
}

function toPlan(profile: Profile, activeStart: string, incomes: OldExport["incomeEvents"]): Plan {
	const cadence = toCadence(profile);
	const incomeCents = toIncomeCents(profile, incomes);
	return {
		cadence,
		cycleStartDay: toStartDay(profile, cadence, activeStart),
		...(incomeCents ? { incomeCents } : {}),
	};
}

function toGoals(subEnvelopes: OldExport["subEnvelopes"], dropped: Conversion["dropped"]) {
	const goals: ImportRow["goals"] = [];
	for (const goal of subEnvelopes) {
		if (goal.isSystemDefault) continue;
		const targetCents = goalTarget(goal);
		if (targetCents <= 0) {
			dropped.emptyGoals += 1;
			continue;
		}
		goals.push({
			name: clip(goal.label, NAME_MAX_LENGTH) || "Meta",
			targetCents,
			savedCents: goal.currentAmount,
		});
	}
	return goals;
}

function toCommitments(commitments: OldExport["fixedCommitments"]): ImportRow["commitments"] {
	return commitments.map((commitment) => ({
		name: clip(commitment.name, NAME_MAX_LENGTH) || "Compromiso",
		amountCents: commitment.amount,
		envelope: commitment.envelope,
		day: commitment.dueDay,
	}));
}

/** Closed cycles run back to back: each ends the day before the next one starts. */
function toCycles(cycles: Cycle[], lookup: Lookup, dropped: Conversion["dropped"]) {
	const converted = cycles.map((cycle) => toCycle(cycle, lookup, dropped));
	const closed: ImportRow["closed"] = [];
	for (let i = 0; i < converted.length - 1; i++) {
		const next = converted[i + 1];
		if (next.startDate <= converted[i].startDate) return null;
		closed.push({
			...converted[i],
			endDate: addDays(next.startDate, -1),
			closedAt: cycles[i + 1].startDate,
		});
	}
	return { closed, open: converted[converted.length - 1] };
}

export function countMovements(row: ImportRow) {
	return [...row.closed, ...(row.open ? [row.open] : [])].reduce(
		(sum, cycle) => sum + cycle.rows.length,
		0,
	);
}

/** A row has to fit in one document and its claim in one transaction. */
export function fits(row: ImportRow) {
	return countMovements(row) <= MAX_MOVEMENTS && JSON.stringify(row).length <= MAX_ROW_BYTES;
}

/**
 * One row per person of the old app, ready for `migrationImports`. Every balance comes from a
 * stored number of the old app, never from adding up its movements: they do not add up there.
 */
export function convert(old: OldExport): Conversion {
	const skipped: Conversion["skipped"] = {
		unverified: 0,
		duplicateEmail: 0,
		noProfile: 0,
		notPen: 0,
		suspended: 0,
		activeCycles: 0,
		cycleDates: 0,
	};
	const dropped: Conversion["dropped"] = { savingsExpenses: 0, emptyGoals: 0 };
	const profiles = new Map(old.profiles.map((profile) => [profile.userId, profile]));
	const cyclesByProfile = groupBy(old.financialCycles, (cycle) => cycle.profileId);
	const subEnvelopesByProfile = groupBy(old.subEnvelopes, (sub) => sub.profileId);
	const commitmentsByProfile = groupBy(old.fixedCommitments, (row) => row.profileId);
	const lookup: Lookup = {
		envelopesByCycle: groupBy(old.envelopes, (envelope) => envelope.cycleId),
		envelopeTypes: new Map(old.envelopes.map((envelope) => [envelope._id, envelope.type])),
		expensesByCycle: groupBy(old.expenses, (expense) => expense.cycleId),
		incomesByCycle: groupBy(old.incomeEvents, (income) => income.cycleId),
	};
	const verified = old.users.filter((user) => user.emailVerified);
	skipped.unverified = old.users.length - verified.length;
	const byEmail = groupBy(verified, (user) => normalizeEmail(user.email));

	const rows: ImportRow[] = [];
	for (const [email, users] of byEmail) {
		if (users.length > 1) {
			skipped.duplicateEmail += users.length;
			continue;
		}
		const profile = profiles.get(users[0]._id);
		if (!profile) {
			skipped.noProfile += 1;
			continue;
		}
		// The new app is in soles only, and a suspended account is not let back in by a migration.
		if (profile.currencyCode !== "PEN" || profile.accountStatus === "suspended") {
			skipped[profile.currencyCode !== "PEN" ? "notPen" : "suspended"] += 1;
			continue;
		}

		const cycles = (cyclesByProfile.get(profile._id) ?? []).sort(
			(a, b) => a.startDate - b.startDate,
		);
		const base = {
			email,
			status: "pending" as const,
			name: clip(profile.name, NAME_MAX_LENGTH),
			split: {
				needs: profile.allocationNeeds,
				wants: profile.allocationWants,
				savings: profile.allocationSavings,
			},
		};
		if (cycles.length === 0) {
			rows.push({ ...base, fundCents: 0, closed: [], goals: [], commitments: [] });
			continue;
		}
		const active = cycles.filter((cycle) => cycle.status === "active");
		if (active.length !== 1 || active[0] !== cycles[cycles.length - 1]) {
			skipped.activeCycles += 1;
			continue;
		}
		const converted = toCycles(cycles, lookup, dropped);
		if (!converted) {
			skipped.cycleDates += 1;
			continue;
		}
		const subEnvelopes = subEnvelopesByProfile.get(profile._id) ?? [];
		const incomes = cycles.flatMap((cycle) => lookup.incomesByCycle.get(cycle._id) ?? []);
		rows.push({
			...base,
			plan: toPlan(profile, converted.open.startDate, incomes),
			fundCents: subEnvelopes.find((sub) => sub.isSystemDefault)?.currentAmount ?? 0,
			...converted,
			goals: toGoals(subEnvelopes, dropped),
			commitments: toCommitments(commitmentsByProfile.get(profile._id) ?? []),
		});
	}
	return { rows, skipped, dropped };
}
