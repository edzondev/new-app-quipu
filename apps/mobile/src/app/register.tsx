import { formatCents, NOTE_MAX_LENGTH, toCents } from "@quipu/backend/shared/budget";
import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
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

export default function RegisterScreen() {
	const [amount, setAmount] = useState("");
	const [note, setNote] = useState("");
	const [envelopeIndex, setEnvelopeIndex] = useState(0);
	const muted = useThemeColor("--color-muted-foreground");
	const amountCents = toCents(amount);
	const envelope: ExpenseEnvelope = EXPENSE_ENVELOPES[envelopeIndex] ?? "needs";
	const canSave = canSaveExpense(amountCents);
	const todayLine = expenseTodayLine(SAMPLE_HOME, amountCents);
	const balanceCents = envelopeBalanceCents(SAMPLE_HOME, envelope);

	return (
		<View className="bg-background px-6 pt-3 pb-6">
			<Text className="text-2xl font-semibold text-foreground">Registrar</Text>

			<View className="mt-5 flex-row items-baseline gap-2 border-b border-input pb-2">
				<Text className="font-mono text-[22px] text-muted-foreground">S/</Text>
				<TextInput
					className="min-w-0 flex-1 font-mono text-[46px] leading-none text-foreground"
					keyboardType="decimal-pad"
					autoFocus
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
				/>
			</View>

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

			<View className="mt-[18px]">
				<Button
					label="Guardar"
					disabled={!canSave}
					onPress={() => {
						// Later: api.transactions.addExpense
						router.back();
					}}
				/>
			</View>
		</View>
	);
}
