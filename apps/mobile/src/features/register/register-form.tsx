import type { api } from "@quipu/backend/convex/_generated/api";
import { type Envelope, formatCents, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Segmented } from "@/components/ui/segmented";
import { SheetHeader } from "@/components/ui/sheet-header";
import type { DetectedDraft } from "@/features/detection/params";
import type { Row } from "@/features/movements/movement-rows";
import { AporteFields } from "@/features/register/aporte-fields";
import { DeleteFlow } from "@/features/register/delete-flow";
import {
	canSaveAmount,
	contributionTodayLine,
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
	type ExpenseEnvelope,
	envelopeBalanceCents,
	expenseTodayLine,
} from "@/features/register/expense";
import { IncomeFields } from "@/features/register/income-fields";
import {
	canAddEarlySalary,
	cycleChoices,
	INITIAL_INCOME,
	type IncomeDraft,
	saveLabel,
} from "@/features/register/income";
import { NoteField } from "@/features/register/note-field";
import { type MovementKind, NOUNS } from "@/features/register/movement-kind";
import { type SaveValues, useMovementActions } from "@/features/register/use-movement-actions";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";

type Home = FunctionReturnType<typeof api.balances.getHome>;
type Household = FunctionReturnType<typeof api.household.get>;

const KIND_LABELS: Record<MovementKind, string> = {
	expense: "Gasto",
	income: "Ingreso",
	contribution: "Aporte",
};
const KINDS: readonly MovementKind[] = ["expense", "income"];
const KINDS_WITH_APORTE: readonly MovementKind[] = [...KINDS, "contribution"];

function initialKind(editing: Row | null, detected: DetectedDraft | null): MovementKind {
	const kind = editing?.kind ?? detected?.kind;
	return kind === "income" || kind === "contribution" ? kind : "expense";
}

function sheetTitle(detected: DetectedDraft | null, editing: Row | null) {
	if (editing) {
		if (editing.kind === "income") return "Editar ingreso";
		return editing.kind === "contribution" ? "Editar aporte" : "Editar gasto";
	}
	if (detected?.kind === "income") return "Registrar ingreso";
	return detected?.kind === "expense" ? "Gasto detectado" : "Registrar";
}

const soles = (cents: number) => wholeSoles(Math.floor(cents / 100) * 100);

export function RegisterForm({
	home,
	household,
	today,
	detected,
	editing,
	onClose,
}: {
	/** Both are undefined while they load: the form is usable meanwhile and fills in when they arrive. */
	home: Home | undefined;
	/** Null without a Nuestro espacio: there is no «Aporte» then. */
	household: Household | undefined;
	today: string;
	detected: DetectedDraft | null;
	editing: Row | null;
	onClose: () => void;
}) {
	const [kind, setKind] = useState(initialKind(editing, detected));
	const [amount, setAmount] = useState(
		editing ? formatCents(editing.amountCents) : detected?.cents ? formatCents(detected.cents) : "",
	);
	const [note, setNote] = useState(editing?.note ?? detected?.merchant ?? "");
	const [envelope, setEnvelope] = useState<ExpenseEnvelope>(
		EXPENSE_ENVELOPES.find((name) => name === editing?.envelope) ?? "needs",
	);
	const [toEnvelope, setToEnvelope] = useState<Envelope>(editing?.toEnvelope ?? "needs");
	const [income, setIncome] = useState<IncomeDraft>(INITIAL_INCOME);
	const [deleting, setDeleting] = useState(false);
	const actions = useMovementActions();
	const muted = useThemeColor("--color-muted-foreground");
	const amountCents = toCents(amount);

	const kinds = household ? KINDS_WITH_APORTE : KINDS;
	const isNewIncome = kind === "income" && !editing;
	const cycles =
		home &&
		canAddEarlySalary({ isNew: isNewIncome, extra: income.extra, earlyWindow: home.earlyWindow })
			? cycleChoices(home.endDate)
			: null;
	// An older expense moves the free money but not what was spent today.
	const change = {
		amountCents,
		originalCents: editing?.amountCents ?? 0,
		countsToday: !editing || editing.date === today,
	};
	const expenseLine = home && kind === "expense" ? expenseTodayLine(home, change) : null;
	const aporteLine =
		home && kind === "contribution"
			? contributionTodayLine(home, { ...change, countsToday: false })
			: null;

	function succeeded() {
		void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		onClose();
	}

	async function save() {
		// Without Plus an aporte is not saved: the person is taken to the offer, like the web.
		if (kind === "contribution" && household?.plus.active === false) {
			router.replace("/plus?feature=space");
			return;
		}
		const trimmed = note.trim() || undefined;
		const id = editing?.id;
		const values: SaveValues =
			kind === "expense"
				? { kind, id, amountCents, envelope, note: trimmed }
				: kind === "income"
					? {
							kind,
							id,
							amountCents,
							note: trimmed,
							extra: income.extra ?? undefined,
							forNextCycle: cycles ? income.forNextCycle : undefined,
						}
					: // The aporte has no concept in the design: an edit keeps the one it had.
						{ kind, id, amountCents, envelope, toEnvelope, note: editing?.note ?? undefined };
		if (await actions.save(values)) succeeded();
	}

	async function remove() {
		if (editing && (await actions.remove(kind, editing.id))) succeeded();
	}

	if (editing && deleting) {
		return (
			<DeleteFlow
				row={editing}
				kind={kind}
				pending={actions.pending}
				error={actions.error}
				onCancel={() => setDeleting(false)}
				onConfirm={() => void remove()}
			/>
		);
	}

	return (
		<View>
			<SheetHeader title={sheetTitle(detected, editing)} sub={detected?.bank} />
			{editing ? null : (
				<View className="mt-2.5">
					<Segmented
						options={kinds.map((name) => KIND_LABELS[name])}
						selectedIndex={kinds.indexOf(kind)}
						onChange={(index) => setKind(kinds[index])}
					/>
				</View>
			)}

			<View className="mt-5 flex-row items-baseline gap-2 border-b border-input pb-2">
				<Text className="font-mono text-[22px] text-muted-foreground">S/</Text>
				<TextInput
					className="min-w-0 flex-1 font-mono text-[46px] leading-none text-foreground"
					keyboardType="decimal-pad"
					autoFocus={!amount}
					value={amount}
					onChangeText={setAmount}
					placeholder="0.00"
					placeholderTextColor={muted}
					accessibilityLabel="Monto"
				/>
			</View>

			{kind === "contribution" ? null : (
				<NoteField
					value={note}
					onChange={setNote}
					placeholder={kind === "expense" ? "Ej. almuerzo" : "Ej. pago de cliente"}
				/>
			)}

			{kind === "expense" ? (
				<>
					<View className="mt-[18px]">
						<SectionLabel>Elige un sobre</SectionLabel>
					</View>
					<View className="mt-2.5 flex-row gap-2">
						{EXPENSE_ENVELOPES.map((name, index) => {
							const selected = name === envelope;
							const balance = home ? soles(envelopeBalanceCents(home, name)) : null;
							return (
								<Pressable
									key={name}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									accessibilityLabel={
										balance === null
											? EXPENSE_ENVELOPE_LABELS[index]
											: `${EXPENSE_ENVELOPE_LABELS[index]}, S/ ${balance}`
									}
									onPress={() => {
										if (selected) return;
										void Haptics.selectionAsync();
										setEnvelope(name);
									}}
									className={`min-h-[52px] min-w-0 flex-1 justify-center rounded-full px-4 ${selected ? "bg-foreground" : "bg-secondary"}`}
								>
									<View className="flex-row items-center gap-2">
										<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[name]}`} />
										<Text
											numberOfLines={1}
											className={`min-w-0 shrink text-[13.5px] font-semibold ${selected ? "text-background" : "text-foreground"}`}
										>
											{EXPENSE_ENVELOPE_LABELS[index]}
										</Text>
									</View>
									{balance === null ? null : (
										<Text
											numberOfLines={1}
											className={`ml-4 font-mono text-[11.5px] opacity-75 ${selected ? "text-background" : "text-foreground"}`}
										>
											S/ {balance}
										</Text>
									)}
								</Pressable>
							);
						})}
					</View>
					{expenseLine ? (
						<Text className="mt-3.5 text-[13px] leading-[19px] text-muted-foreground">
							{expenseLine}
						</Text>
					) : null}
				</>
			) : null}

			{isNewIncome && home ? (
				<IncomeFields
					home={home}
					amountCents={amountCents}
					income={income}
					cycles={cycles}
					onChange={(patch) => setIncome((current) => ({ ...current, ...patch }))}
				/>
			) : null}

			{kind === "contribution" ? (
				<AporteFields
					from={envelope}
					to={toEnvelope}
					line={aporteLine}
					onFromChange={setEnvelope}
					onToChange={setToEnvelope}
				/>
			) : null}

			{editing ? (
				<Pressable
					accessibilityRole="button"
					onPress={() => setDeleting(true)}
					className="mt-3.5 min-h-11 items-center justify-center active:opacity-60"
				>
					<Text className="text-[13.5px] font-medium text-warning-foreground underline">
						{`Eliminar ${NOUNS[kind]}`}
					</Text>
				</Pressable>
			) : null}

			{actions.error ? (
				<Text accessibilityRole="alert" className="mt-3.5 text-[13px] text-warning-foreground">
					{actions.error}
				</Text>
			) : null}

			<View className="mt-[18px] mb-2">
				<Button
					label={
						editing
							? "Guardar cambios"
							: kind === "contribution"
								? "Aportar"
								: saveLabel(cycles, income)
					}
					loading={actions.pending}
					// A new income waits for the cycle: its window decides whether the cycle is asked.
					disabled={!canSaveAmount(amountCents) || (isNewIncome && !home)}
					onPress={() => void save()}
				/>
			</View>
		</View>
	);
}
