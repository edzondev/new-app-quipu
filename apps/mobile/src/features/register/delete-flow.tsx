import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { Row } from "@/features/movements/movement-rows";

// Excepción: texto de ejemplo, el mensaje real lo lanza el servidor al borrar un ingreso (D4i)
const SAMPLE_DELETE_BLOCKED =
	"Ya moviste S/ 200 de este Ahorro. Primero borra o retira ese aporte.";

export function DeleteFlow({
	row,
	onCancel,
	onDeleted,
}: {
	row: Row;
	onCancel: () => void;
	onDeleted: () => void;
}) {
	const [blocked, setBlocked] = useState(false);
	const isIncome = row.kind === "income";
	const noun = isIncome ? "ingreso" : "gasto";
	const who = [row.note, `S/ ${formatCents(row.amountCents)}`].filter(Boolean).join(" · ");

	return (
		<View>
			<Text className="text-[28px] leading-8 font-semibold text-foreground">
				{blocked ? `No se puede borrar este ${noun}` : `¿Eliminar este ${noun}?`}
			</Text>
			<Text className="mt-2 text-sm leading-5 text-muted-foreground">{who}</Text>
			{!isIncome && row.envelope ? (
				<Text className="text-sm leading-5 text-muted-foreground">
					El monto vuelve a {ENVELOPE_LABELS[row.envelope]}.
				</Text>
			) : null}
			{blocked ? (
				<>
					<View accessibilityRole="alert" className="mt-3.5">
						<Notice tone="warning">{SAMPLE_DELETE_BLOCKED}</Notice>
					</View>
					<View className="mt-6">
						<Button label="Entendido" onPress={onCancel} />
					</View>
				</>
			) : (
				<View className="mt-6 gap-2">
					<Button
						label="Eliminar"
						variant="warning"
						onPress={() => {
							// Later: api.transactions.deleteExpense / deleteIncome.
							if (isIncome) {
								setBlocked(true);
								return;
							}
							void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
							onDeleted();
						}}
					/>
					<Button label="Cancelar" variant="secondary" onPress={onCancel} />
				</View>
			)}
		</View>
	);
}
