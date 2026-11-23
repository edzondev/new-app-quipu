import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import * as Haptics from "expo-haptics";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import type { Row } from "@/features/movements/movement-rows";

export function DeleteFlow({
	row,
	onCancel,
	onDeleted,
}: {
	row: Row;
	onCancel: () => void;
	onDeleted: () => void;
}) {
	const isIncome = row.kind === "income";
	const noun = isIncome ? "ingreso" : "gasto";
	const who = [row.note, `S/ ${formatCents(row.amountCents)}`].filter(Boolean).join(" · ");

	return (
		<View>
			<Text className="text-[28px] leading-8 font-semibold text-foreground">
				{`¿Eliminar este ${noun}?`}
			</Text>
			<Text className="mt-2 text-sm leading-5 text-muted-foreground">{who}</Text>
			{!isIncome && row.envelope ? (
				<Text className="text-sm leading-5 text-muted-foreground">
					El monto vuelve a {ENVELOPE_LABELS[row.envelope]}.
				</Text>
			) : null}
			<View className="mt-6 gap-2">
				<Button
					label="Eliminar"
					variant="warning"
					onPress={() => {
						// Later: api.transactions.deleteExpense / deleteIncome.
						void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
						onDeleted();
					}}
				/>
				<Button label="Cancelar" variant="secondary" onPress={onCancel} />
			</View>
		</View>
	);
}
