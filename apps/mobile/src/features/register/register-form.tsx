import { formatCents, NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { KeyboardAvoidingView } from "@/components/ui/keyboard-avoiding-view";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import type { DetectedDraft } from "@/features/detection/params";
import { SAMPLE_HOME } from "@/features/home/sample";
import {
	canSaveExpense,
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
	type ExpenseEnvelope,
	envelopeBalanceCents,
	expenseTodayLine,
} from "@/features/register/expense";
import { useThemeColor } from "@/lib/use-theme-color";

export function RegisterForm({ detected }: { detected: DetectedDraft | null }) {
	const income = detected?.kind === "income";
	const [amount, setAmount] = useState(detected ? formatCents(detected.cents) : "");
	const [note, setNote] = useState(detected?.merchant ?? "");
	const [envelopeIndex, setEnvelopeIndex] = useState(0);
	const muted = useThemeColor("--color-muted-foreground");
	const amountCents = toCents(amount);
	const envelope: ExpenseEnvelope = EXPENSE_ENVELOPES[envelopeIndex] ?? "needs";
	const canSave = canSaveExpense(amountCents);
	const todayLine = income ? null : expenseTodayLine(SAMPLE_HOME, amountCents);
	const balanceCents = envelopeBalanceCents(SAMPLE_HOME, envelope);
	const title =
		detected?.kind === "income"
			? "Registrar ingreso"
			: detected?.kind === "expense"
				? "Gasto detectado"
				: "Registrar";

	return (
		<KeyboardAvoidingView behavior="padding" className="bg-background">
			<View className="px-6 pt-3 pb-6">
				<Text className="text-2xl font-semibold text-foreground">{title}</Text>
				{detected?.bank ? (
					<Text className="mt-1 text-[13px] text-muted-foreground">{detected.bank}</Text>
				) : null}

				<View className="mt-5 flex-row items-baseline gap-2 border-b border-input pb-2">
					<Text className="font-mono text-[22px] text-muted-foreground">S/</Text>
					<TextInput
						className="min-w-0 flex-1 font-mono text-[46px] leading-none text-foreground"
						keyboardType="decimal-pad"
						autoFocus={!detected}
						value={amount}
						onChangeText={setAmount}
						placeholder="0.00"
						placeholderTextColor={muted}
						accessibilityLabel="Monto"
					/>
				</View>

				<Text className="mt-4 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
					Concepto · opcional
				</Text>
				<View className="mt-1">
					<TextField
						value={note}
						onChangeText={setNote}
						placeholder="Ej. almuerzo"
						maxLength={NOTE_MAX_LENGTH}
						accessibilityLabel="Concepto"
					/>
				</View>

				{income ? (
					<Text className="mt-[18px] text-base text-foreground">Para este ciclo</Text>
				) : (
					<>
						<Text className="mt-[18px] text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
							Elige un sobre
						</Text>
						<View className="mt-2.5">
							<Segmented
								options={EXPENSE_ENVELOPE_LABELS}
								selectedIndex={envelopeIndex}
								onChange={setEnvelopeIndex}
							/>
						</View>
						<Text className="mt-2 font-mono text-[13px] text-muted-foreground">
							S/ {formatCents(balanceCents)}
						</Text>
						{todayLine ? (
							<Text className="mt-3.5 text-[13px] text-muted-foreground">{todayLine}</Text>
						) : null}
					</>
				)}

				<View className="mt-[18px]">
					<Button
						label="Guardar"
						disabled={!canSave}
						onPress={() => {
							// Later: api.transactions.addExpense, and the vibration once it succeeds.
							void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
							router.back();
						}}
					/>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}
