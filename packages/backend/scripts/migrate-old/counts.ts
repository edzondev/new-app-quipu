import { NAME_MAX_LENGTH, NOTE_MAX_LENGTH } from "../../shared/budget.ts";
import { convert, countMovements, groupBy, type OldExport } from "./convert.ts";

type Row = Record<string, unknown>;

/** Tables this PR does not migrate, read only to count them. Null when the export has no such table. */
export type CountOnly = {
	financialSpaces: Row[] | null;
	spaceMembers: Row[] | null;
	commitmentReservations: Row[] | null;
	internalTransfers: Row[] | null;
	polarCustomers: Row[] | null;
	polarSubscriptions: Row[] | null;
};

export type Counts = Record<string, number | null>;

const count = <T>(items: T[], test: (item: T) => boolean) => items.filter(test).length;
const largest = (sizes: number[]) => sizes.reduce((max, size) => Math.max(max, size), 0);
const groupSizes = <T>(items: T[], key: (item: T) => string) =>
	[...groupBy(items, key).values()].map((group) => group.length);

function countBy(rows: Row[] | null, field: string, prefix: string): Counts {
	if (!rows) return { [prefix]: null };
	const groups = groupBy(rows, (row) => String(row[field]));
	return Object.fromEntries(
		[...groups].map(([value, group]) => [`${prefix}.${value}`, group.length]),
	);
}

/**
 * Totals of the old app, to decide the scope before converting. Only counts: no email, name,
 * note or amount of a single person ever leaves this function.
 */
export function counts(old: OldExport, extra: CountOnly, now: number): Counts {
	const { rows, skipped, dropped } = convert(old);
	const active = old.financialCycles.filter((cycle) => cycle.status === "active");
	const activeIds = new Set(active.map((cycle) => cycle._id));
	const goals = old.subEnvelopes.filter((sub) => !sub.isSystemDefault);
	const profilesWithFund = new Set(
		old.subEnvelopes.filter((sub) => sub.isSystemDefault).map((sub) => sub.profileId),
	);
	const extraordinary = old.incomeEvents.filter((income) => income.incomeKind === "extraordinary");
	const splitSum = (income: OldExport["incomeEvents"][number]) =>
		income.distributionApplied.needs +
		income.distributionApplied.wants +
		income.distributionApplied.savings;

	return {
		"usuarios.enBetterAuth": old.users.length,
		"usuarios.verificados": count(old.users, (user) => user.emailVerified),
		"usuarios.conPerfil": old.profiles.length,
		"usuarios.conCiclos": groupBy(old.financialCycles, (cycle) => cycle.profileId).size,
		"usuarios.filasAMigrar": rows.length,
		"usuarios.filasSoloRegalo": count(rows, (row) => !row.open),
		"usuarios.premium": count(old.profiles, (profile) => profile.plan === "premium"),
		"omitidos.sinVerificar": skipped.unverified,
		"omitidos.emailRepetido": skipped.duplicateEmail,
		"omitidos.sinPerfil": skipped.noProfile,
		"omitidos.noEstanEnSoles": skipped.notPen,
		"omitidos.suspendidos": skipped.suspended,
		"omitidos.sinUnCicloActivo": skipped.activeCycles,
		"omitidos.ciclosEnElMismoDia": skipped.cycleDates,
		"ingreso.fijo": count(old.profiles, (profile) => profile.incomeModel === "fixed"),
		"ingreso.variable": count(old.profiles, (profile) => profile.incomeModel === "variable"),
		"ingreso.mixto": count(old.profiles, (profile) => profile.incomeModel === "mixed"),

		"ciclos.total": old.financialCycles.length,
		"ciclos.cerrados": old.financialCycles.length - active.length,
		"ciclos.activos": active.length,
		"ciclos.maximoPorUsuario": largest(groupSizes(old.financialCycles, (cycle) => cycle.profileId)),
		"ciclos.deApertura": count(old.financialCycles, (cycle) => cycle.isOpeningCycle === true),
		"ciclos.activosConDineroSinAsignar": count(
			active,
			(cycle) => (cycle.unallocatedCents ?? 0) > 0,
		),
		"ciclos.porRevisar": count(old.financialCycles, (cycle) => cycle.needsReview === true),
		"ciclos.conCoberturaDelCoach": count(
			old.financialCycles,
			(cycle) => cycle.coverageBoost != null,
		),

		"movimientos.gastos": old.expenses.length,
		"movimientos.ingresos": old.incomeEvents.length,
		"movimientos.maximoPorFila": largest(rows.map(countMovements)),
		"movimientos.filaMasGrandeKb": Math.ceil(
			largest(rows.map((row) => JSON.stringify(row).length)) / 1024,
		),
		"movimientos.gastosContraAhorro": dropped.savingsExpenses,
		"movimientos.ingresosConRetencion": count(
			old.incomeEvents,
			(income) => (income.heldCents ?? 0) > 0,
		),
		"movimientos.ingresosQueNoSumanSuReparto": count(
			old.incomeEvents,
			(income) => splitSum(income) !== income.amount,
		),
		"movimientos.notasRecortadas": count(
			[...old.expenses, ...old.incomeEvents],
			(row) => row.description.trim().length > NOTE_MAX_LENGTH,
		),
		"extras.total": extraordinary.length,
		...countBy(extraordinary, "extraordinaryType", "extras.tipo"),
		"extras.todoAAhorro": count(
			extraordinary,
			(income) => income.distributionPolicy === "all_to_savings",
		),

		"metas.total": goals.length,
		"metas.usuariosCon3OMas": count(
			groupSizes(goals, (goal) => goal.profileId),
			(size) => size >= 3,
		),
		"metas.sinObjetivo": count(goals, (goal) => goal.targetAmount === undefined),
		"metas.sinObjetivoNiSaldo": dropped.emptyGoals,
		"metas.perfilesSinFondo": count(old.profiles, (profile) => !profilesWithFund.has(profile._id)),

		"compromisos.total": old.fixedCommitments.length,
		"compromisos.pagadosEnElCicloActivo": count(
			old.fixedCommitments,
			(row) => row.paidForCycleId !== undefined && activeIds.has(row.paidForCycleId),
		),
		"compromisos.vencidos": count(
			old.fixedCommitments,
			(row) => row.nextDueAt !== undefined && row.nextDueAt < now,
		),
		"compromisos.nombresRecortados": count(
			old.fixedCommitments,
			(row) => row.name.trim().length > NAME_MAX_LENGTH,
		),
		"compromisos.reservasActivas":
			extra.commitmentReservations &&
			count(
				extra.commitmentReservations,
				(row) => row.status === "active" || row.status === "partially_consumed",
			),

		"hogares.total": extra.financialSpaces && extra.financialSpaces.length,
		...countBy(extra.financialSpaces ?? [], "status", "hogares"),
		"hogares.miembrosActivos":
			extra.spaceMembers && count(extra.spaceMembers, (row) => row.status === "active"),
		"polar.clientes": extra.polarCustomers && extra.polarCustomers.length,
		...countBy(extra.polarSubscriptions, "status", "polar.suscripciones"),
		...countBy(extra.internalTransfers, "kind", "transferenciasInternas"),
	};
}
