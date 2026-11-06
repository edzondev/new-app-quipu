import { addDays, formatDay, getCycleRange, getNextCycleRange } from "@quipu/backend/shared/dates";
import { cycleLabel, type Plan } from "@quipu/backend/shared/plan";

/** "El siguiente ciclo va del 1 nov al 14 dic." when a short stretch joins the next period, else null. */
export function getJoinedCycleText(nextPlan: Plan, currentEnd: string) {
	const startDate = addDays(currentEnd, 1);
	const { cadence, cycleStartDay } = nextPlan;
	const next = getNextCycleRange(cadence, cycleStartDay, startDate);
	if (next.endDate === getCycleRange(cadence, cycleStartDay, startDate).endDate) return null;
	return `El siguiente ciclo va del ${formatDay(next.startDate)} al ${formatDay(next.endDate)}.`;
}

/** The lines of the Ciclo row: what applies now and, if there is one, the change that comes next. */
export function getCycleLines({
	plan,
	nextPlan,
	currentEnd,
}: {
	plan: Plan;
	nextPlan: Plan | null;
	currentEnd: string;
}) {
	if (!nextPlan) return [`${cycleLabel(plan)} · los cambios aplican desde el próximo ciclo`];
	return [
		`Ahora: ${cycleLabel(plan)}. Tu ciclo actual cierra el ${formatDay(currentEnd)}.`,
		`Desde el ${formatDay(addDays(currentEnd, 1))}: ${cycleLabel(nextPlan)}.`,
		getJoinedCycleText(nextPlan, currentEnd),
	].filter((line) => line !== null);
}
