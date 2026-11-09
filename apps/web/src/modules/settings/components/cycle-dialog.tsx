import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatDay } from "@quipu/backend/shared/dates";
import { type Cadence, isSamePlan, type Plan, parseStartDay } from "@quipu/backend/shared/plan";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
	FormSheetClose,
	FormSheetDescription,
	FormSheetFooter,
	FormSheetHeader,
	FormSheetPanel,
	FormSheetTitle,
} from "#/components/form-sheet";
import { readError } from "#/lib/read-error";
import { CadenceToggle, StartDaySelect } from "#/modules/onboarding/components/cycle-fields";
import { getJoinedCycleText } from "../cycle-summary";
import { ActionDialog } from "./action-dialog";

type Props = {
	/** Whose cycle it is: the household changes straight away for its next cycle, Personal keeps a pending plan. */
	space: "personal" | "household";
	plan: Plan;
	nextPlan: Plan | null;
	/** Last day of the cycle that is open now. */
	currentEnd: string;
};

function CycleEditor({
	space,
	plan,
	nextPlan,
	currentEnd,
	onDone,
}: Props & { onDone: () => void }) {
	// Starts from the pending change if there is one: that is what the person is editing.
	const base = nextPlan ?? plan;
	const [cadence, setCadence] = useState<Cadence>(base.cadence);
	const [startDay, setStartDay] = useState(String(base.cycleStartDay));
	const updatePlan = useConvexMutation(api.settings.updatePlan);
	const updateCycle = useConvexMutation(api.household.updateCycle);
	const candidate: Plan = {
		cadence,
		cycleStartDay: parseStartDay(startDay),
		incomeCents: plan.incomeCents,
	};
	const save = useMutation({
		mutationFn: () =>
			space === "household"
				? updateCycle({ cadence: candidate.cadence, cycleStartDay: candidate.cycleStartDay })
				: updatePlan(candidate),
		onSuccess: onDone,
	});
	// Going back to the current plan clears the pending change, so there is nothing to explain.
	const joinedText = isSamePlan(plan, candidate) ? null : getJoinedCycleText(candidate, currentEnd);

	return (
		<form
			noValidate
			className="contents"
			onSubmit={(event) => {
				event.preventDefault();
				save.mutate();
			}}
		>
			<FormSheetHeader>
				<FormSheetTitle>Ciclo</FormSheetTitle>
				<FormSheetDescription>
					Aplica desde tu próximo ciclo. Tu ciclo actual cierra el {formatDay(currentEnd)}.
				</FormSheetDescription>
			</FormSheetHeader>
			<FormSheetPanel>
				<p className="mb-2 text-sm text-muted-foreground">Cada cuánto</p>
				<CadenceToggle
					value={cadence}
					onChange={(next) => {
						setCadence(next);
						setStartDay("1");
					}}
				/>
				<StartDaySelect cadence={cadence} name="startDay" value={startDay} onChange={setStartDay} />
				{joinedText ? <p className="mt-4 text-sm text-muted-foreground">{joinedText}</p> : null}
				{save.isError ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{readError(save.error)}
					</p>
				) : null}
			</FormSheetPanel>
			<FormSheetFooter variant="bare">
				<FormSheetClose
					render={<Button type="button" variant="outline" size="xl" className="rounded-full" />}
				>
					Cancelar
				</FormSheetClose>
				<Button type="submit" size="xl" className="rounded-full" loading={save.isPending}>
					Guardar
				</Button>
			</FormSheetFooter>
		</form>
	);
}

export function CycleDialog(props: Props) {
	return (
		<ActionDialog label="Cambiar">
			{(close) => <CycleEditor {...props} onDone={close} />}
		</ActionDialog>
	);
}
