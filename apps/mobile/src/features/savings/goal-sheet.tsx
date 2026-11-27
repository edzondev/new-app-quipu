import type { api } from "@quipu/backend/convex/_generated/api";
import { NAME_MAX_LENGTH } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { type ReactNode, useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { SheetHeader } from "@/components/ui/sheet-header";
import { SheetViews } from "@/components/ui/sheet-views";
import { TextField } from "@/components/ui/text-field";
import { DayRow } from "@/features/cycle/day-row";
import { MoneyField } from "@/features/onboarding/money-field";
import { PlusContent } from "@/features/plus/plus-sheet";
import { ConfirmView, WarningLink, WarningText } from "./confirm-view";
import { goalDraft, type GoalDraft, goalFields, removeGoalText, singleLine } from "./goal-form";
import { GoalMonthList } from "./goal-month-list";
import { targetMonthLabel } from "./goal-progress";
import { useSavingActions } from "./use-saving-actions";

type Goal = FunctionReturnType<typeof api.goals.list>[number];

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<View className="mt-3.5">
			<Text className="text-[13px] text-muted-foreground">{label}</Text>
			{children}
		</View>
	);
}

/**
 * G4: creates a goal, or edits and deletes `goal`. The draft lives here, so it survives the month list and
 * the Plus offer: when the backend asks for Plus, the offer takes this same sheet and closing it brings the
 * form back as it was. The errors show from the first save on, like the web.
 */
export function GoalSheet({
	space,
	goal,
	today,
	onDone,
	onTrial,
}: {
	space: "personal" | "household";
	goal: Goal | null;
	today: string;
	onDone: () => void;
	onTrial: (endsAt: number) => void;
}) {
	const [draft, setDraft] = useState(goalDraft(goal));
	const [submitted, setSubmitted] = useState(false);
	const [view, setView] = useState<"form" | "month" | "remove" | "plus">("form");
	const actions = useSavingActions(space, () => {
		Keyboard.dismiss();
		setView("plus");
	});
	const result = goalFields(draft);
	const errors = submitted && !result.ok ? result.errors : null;
	const change = (patch: Partial<GoalDraft>) => setDraft((current) => ({ ...current, ...patch }));

	async function save() {
		setSubmitted(true);
		if (!result.ok) return;
		const ok = goal
			? await actions.run({ kind: "updateGoal", id: goal.id, ...result.fields })
			: await actions.run({ kind: "addGoal", ...result.fields });
		if (ok) onDone();
	}

	async function remove() {
		if (goal && (await actions.run({ kind: "removeGoal", id: goal.id }))) onDone();
	}

	if (view === "plus") {
		return <PlusContent feature="goals" onClose={() => setView("form")} onTrial={onTrial} />;
	}

	if (goal && view === "remove") {
		return (
			<ConfirmView
				title="¿Borrar la meta?"
				body={removeGoalText(goal)}
				confirmLabel="Borrar meta"
				cancelLabel="Mantener meta"
				pending={actions.pending}
				error={actions.error}
				onConfirm={() => void remove()}
				onCancel={() => setView("form")}
			/>
		);
	}

	const picksMonth = view === "month";
	const back = () => setView("form");

	// The month list slides in over the form, like the day lists of Compromisos; the header stays.
	return (
		<View>
			<SheetHeader
				title={picksMonth ? "¿Para cuándo?" : goal ? "Editar meta" : "Nueva meta"}
				onBack={picksMonth ? back : undefined}
			/>
			<SheetViews view={picksMonth ? "month" : null}>
				{picksMonth ? (
					<GoalMonthList
						value={draft.month}
						today={today}
						onPick={(month) => {
							change({ month });
							back();
						}}
					/>
				) : (
					<View>
						<Field label="Nombre de la meta">
							<TextField
								value={draft.name}
								onChangeText={(name) => change({ name: singleLine(name) })}
								placeholder="ej. Viaje a Cusco"
								maxLength={NAME_MAX_LENGTH}
								accessibilityLabel="Nombre de la meta"
							/>
							<WarningText>{errors?.name ?? null}</WarningText>
						</Field>
						<Field label="Meta">
							<MoneyField
								large
								label="Meta"
								value={draft.amount}
								onChange={(amount) => change({ amount })}
								invalid={Boolean(errors?.amount)}
							/>
							<WarningText>{errors?.amount ?? null}</WarningText>
						</Field>
						<DayRow
							label="Para cuándo · opcional"
							value={targetMonthLabel(draft.month || null)}
							accessibilityLabel={`Para cuándo, ${targetMonthLabel(draft.month || null)}. Cambiar`}
							onPress={() => setView("month")}
						/>
						{draft.month ? (
							<Pressable
								accessibilityRole="button"
								accessibilityLabel="Quitar el mes"
								onPress={() => change({ month: "" })}
								className="min-h-11 justify-center self-start active:opacity-60"
							>
								<Text className="text-[13px] text-muted-foreground underline">Quitar</Text>
							</Pressable>
						) : null}
						<WarningText>{actions.error}</WarningText>
						<View className="mt-[18px] mb-2">
							<Button
								label={goal ? "Guardar meta" : "Crear meta"}
								loading={actions.pending}
								onPress={() => void save()}
							/>
							{goal ? <WarningLink label="Borrar meta" onPress={() => setView("remove")} /> : null}
						</View>
					</View>
				)}
			</SheetViews>
		</View>
	);
}
