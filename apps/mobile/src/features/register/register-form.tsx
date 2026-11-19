import { formatCents, NOTE_MAX_LENGTH, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { Segmented } from "@/components/ui/segmented";
import { SheetHeader } from "@/components/ui/sheet-header";
import { TextField } from "@/components/ui/text-field";
import type { DetectedDraft } from "@/features/detection/params";
import { SAMPLE_HOME } from "@/features/home/sample";
import type { Row } from "@/features/movements/movement-rows";
import { DeleteFlow } from "@/features/register/delete-flow";
import {
	canSaveAmount,
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
	type ExpenseEnvelope,
	envelopeBalanceCents,
	expenseTodayLine,
} from "@/features/register/expense";
import { IncomeFields } from "@/features/register/income-fields";
import {
	cycleChoices,
	INITIAL_INCOME,
	type IncomeDraft,
	saveLabel,
} from "@/features/register/income";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";

const KINDS = ["expense", "income"] as const;
const KIND_LABELS = ["Gasto", "Ingreso"];

function sheetTitle(detected: DetectedDraft | null, editing: Row | null) {
	if (editing) return editing.kind === "income" ? "Editar ingreso" : "Editar gasto";
	if (detected?.kind === "income") return "Registrar ingreso";
	return detected?.kind === "expense" ? "Gasto detectado" : "Registrar";
}

const soles = (cents: number) => wholeSoles(Math.floor(cents / 100) * 100);

export function RegisterForm({
	detected,
	editing,
	onClose,
}: {
	detected: DetectedDraft | null;
	editing: Row | null;
	onClose: () => void;
}) {
	const home = SAMPLE_HOME;
	const [kind, setKind] = useState<(typeof KINDS)[number]>(
		(editing?.kind ?? detected?.kind) === "income" ? "income" : "expense",
	);
	const [amount, setAmount] = useState(
		editing ? formatCents(editing.amountCents) : detected ? formatCents(detected.cents) : "",
	);
	const [note, setNote] = useState(editing?.note ?? detected?.merchant ?? "");
	const [envelope, setEnvelope] = useState<ExpenseEnvelope>(
		EXPENSE_ENVELOPES.find((name) => name === editing?.envelope) ?? "needs",
	);
	const [income, setIncome] = useState<IncomeDraft>(INITIAL_INCOME);
	const [deleting, setDeleting] = useState(false);
	const muted = useThemeColor("--color-muted-foreground");
	const amountCents = toCents(amount);
	const expenseLine = expenseTodayLine(home, amountCents);

	if (editing && deleting) {
		return <DeleteFlow row={editing} onCancel={() => setDeleting(false)} onDeleted={onClose} />;
	}

	const cycles =
		kind === "income" && !income.extra && home.earlyWindow ? cycleChoices(home.endDate) : null;

	return (
		<View>
			<SheetHeader title={sheetTitle(detected, editing)} sub={detected?.bank} />
			<View className="mt-2.5">
				<Segmented
					options={KIND_LABELS}
					selectedIndex={KINDS.indexOf(kind)}
					onChange={(index) => setKind(KINDS[index])}
				/>
			</View>

			<View className="mt-5 flex-row items-baseline gap-2 border-b border-input pb-2">
				<Text className="font-mono text-[22px] text-muted-foreground">S/</Text>
				<TextInput
					className="min-w-0 flex-1 font-mono text-[46px] leading-none text-foreground"
					keyboardType="decimal-pad"
					autoFocus={!detected && !editing}
					value={amount}
					onChangeText={setAmount}
					placeholder="0.00"
					placeholderTextColor={muted}
					accessibilityLabel="Monto"
				/>
			</View>

			{kind === "income" ? (
				<IncomeFields
					home={home}
					amountCents={amountCents}
					income={income}
					cycles={cycles}
					onChange={(patch) => setIncome((current) => ({ ...current, ...patch }))}
				/>
			) : (
				<>
					<Text className="mt-4 text-[13px] text-muted-foreground">Concepto · opcional</Text>
					<TextField
						value={note}
						onChangeText={setNote}
						placeholder="Ej. almuerzo"
						maxLength={NOTE_MAX_LENGTH}
						accessibilityLabel="Concepto"
					/>
					<View className="mt-[18px]">
						<SectionLabel>Elige un sobre</SectionLabel>
					</View>
					<View className="mt-2.5 flex-row gap-2">
						{EXPENSE_ENVELOPES.map((name, index) => {
							const selected = name === envelope;
							const balance = soles(envelopeBalanceCents(home, name));
							return (
								<Pressable
									key={name}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									accessibilityLabel={`${EXPENSE_ENVELOPE_LABELS[index]}, S/ ${balance}`}
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
									<Text
										numberOfLines={1}
										className={`ml-4 font-mono text-[11.5px] opacity-75 ${selected ? "text-background" : "text-foreground"}`}
									>
										S/ {balance}
									</Text>
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
			)}

			{editing ? (
				<Pressable
					accessibilityRole="button"
					onPress={() => setDeleting(true)}
					className="mt-3.5 min-h-11 items-center justify-center active:opacity-60"
				>
					<Text className="text-[13.5px] font-medium text-warning-foreground underline">
						{editing.kind === "income" ? "Eliminar ingreso" : "Eliminar gasto"}
					</Text>
				</Pressable>
			) : null}

			<View className="mt-[18px] mb-2">
				<Button
					label={editing ? "Guardar cambios" : saveLabel(cycles, income)}
					disabled={!canSaveAmount(amountCents)}
					onPress={() => {
						// Later: api.transactions.addExpense / addIncome / updateExpense / updateIncome, and the vibration once it succeeds.
						void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						onClose();
					}}
				/>
			</View>
		</View>
	);
}
