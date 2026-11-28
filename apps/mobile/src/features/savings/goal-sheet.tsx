import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NAME_MAX_LENGTH, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { type ReactNode, useState } from "react";
import { Keyboard, Pressable, Text, View } from "react-native";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import AngleRight from "reicon-react-native/icons/AngleRight";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { OptionList } from "@/components/ui/option-list";
import { SheetHeader } from "@/components/ui/sheet-header";
import { SheetViews } from "@/components/ui/sheet-views";
import { TextField } from "@/components/ui/text-field";
import { WarningTextButton } from "@/components/ui/warning-text-button";
import { DayRow } from "@/features/cycle/day-row";
import { MoneyField } from "@/features/onboarding/money-field";
import { PlusContent } from "@/features/plus/plus-sheet";
import { useThemeColor } from "@/lib/use-theme-color";
import { ConfirmView, WarningText } from "./confirm-view";
import {
	goalDraft,
	type GoalDraft,
	goalFields,
	monthOptions,
	removeGoalText,
	singleLine,
	targetMonthLabel,
} from "./savings";
import { useSavingActions } from "./use-saving-actions";

function YearButton({
	label,
	disabled,
	onPress,
	children,
}: {
	label: string;
	disabled: boolean;
	onPress: () => void;
	children: ReactNode;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			className={`size-11 items-center justify-center active:opacity-60 ${disabled ? "opacity-40" : ""}`}
		>
			{children}
		</Pressable>
	);
}

/** «¿Para cuándo?» (its title is in the sheet header): one year at a time, from this one on, like the web's month grid. Past months are not offered. */
function GoalMonthList({
	value,
	today,
	onPick,
}: {
	value: string;
	today: string;
	onPick: (month: string) => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const thisYear = Number(today.slice(0, 4));
	// Starts on the chosen month's year; one already past starts on this year.
	const [year, setYear] = useState(Math.max(thisYear, Number(value.slice(0, 4)) || thisYear));

	return (
		<View>
			<View className="mt-1.5 flex-row items-center justify-between">
				<YearButton
					label="Año anterior"
					disabled={year <= thisYear}
					onPress={() => setYear(year - 1)}
				>
					<AngleLeft size={20} color={foreground} />
				</YearButton>
				<Text className="font-mono text-base text-foreground">{year}</Text>
				<YearButton label="Año siguiente" disabled={false} onPress={() => setYear(year + 1)}>
					<AngleRight size={20} color={foreground} />
				</YearButton>
			</View>
			<OptionList options={monthOptions(year, today)} value={value} onPick={onPick} />
		</View>
	);
}

/** G6: opens with the goal, or with the suggestion when there is none. Nuestro espacio has no suggestion. */
export function FundGoalSheet({
	space,
	fundGoalCents,
	suggestedCents,
	onDone,
}: {
	space: "personal" | "household";
	fundGoalCents: number | null;
	suggestedCents: number | null;
	onDone: () => void;
}) {
	const initial = fundGoalCents ?? suggestedCents;
	const [amount, setAmount] = useState(initial ? formatCents(initial) : "");
	const [removing, setRemoving] = useState(false);
	const actions = useSavingActions(space);
	const targetCents = toCents(amount);

	async function save(cents: number | null) {
		if (await actions.run({ kind: "setFundGoal", targetCents: cents })) onDone();
	}

	if (removing) {
		return (
			<ConfirmView
				title="¿Quitar la meta?"
				body="Tener un fondo de emergencia te protege. Tu plata se queda en el fondo."
				confirmLabel="Quitar"
				cancelLabel="Mantener meta"
				pending={actions.pending}
				error={actions.error}
				onConfirm={() => void save(null)}
				onCancel={() => setRemoving(false)}
			/>
		);
	}

	return (
		<View>
			<SheetHeader title="Meta del fondo" />
			<View className="mt-2">
				<MoneyField large label="Meta del fondo" value={amount} onChange={setAmount} />
			</View>
			{suggestedCents ? (
				<>
					<View className="mt-3.5">
						<Chips
							options={[`3 meses de Necesidades · S/ ${wholeSoles(suggestedCents)}`]}
							selectedIndex={-1}
							onChange={() => setAmount(formatCents(suggestedCents))}
						/>
					</View>
					<Text className="mt-3 text-[13px] leading-[19px] text-muted-foreground">
						Sugerimos 3 meses de lo que gastas en Necesidades. Puedes poner otra cifra.
					</Text>
				</>
			) : null}
			<WarningText>{actions.error}</WarningText>
			<View className="mt-[18px] mb-2">
				<Button
					label="Guardar meta"
					loading={actions.pending}
					disabled={targetCents <= 0}
					onPress={() => void save(targetCents)}
				/>
				{fundGoalCents ? (
					<WarningTextButton label="Quitar meta" onPress={() => setRemoving(true)} />
				) : null}
			</View>
		</View>
	);
}

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
						<WarningText>{actions.error}</WarningText>
						<View className="mt-[18px] mb-2">
							<Button
								label={goal ? "Guardar meta" : "Crear meta"}
								loading={actions.pending}
								onPress={() => void save()}
							/>
							{goal ? (
								<WarningTextButton label="Borrar meta" onPress={() => setView("remove")} />
							) : null}
						</View>
					</View>
				)}
			</SheetViews>
		</View>
	);
}
