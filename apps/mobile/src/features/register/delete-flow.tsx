import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import type { Row } from "@/features/movements/movement-rows";
import { type MovementKind, NOUNS } from "@/features/register/movement-kind";

/** D4: confirms in the same sheet. Deleting is the form's job: this only shows its state and its error. */
export function DeleteFlow({
	row,
	kind,
	pending,
	error,
	onCancel,
	onConfirm,
}: {
	row: Row;
	kind: MovementKind;
	pending: boolean;
	error: string | null;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	const who = [row.note, `S/ ${formatCents(row.amountCents)}`].filter(Boolean).join(" · ");

	return (
		<View>
			<Text className="text-[28px] leading-8 font-semibold text-foreground">
				{`¿Eliminar este ${NOUNS[kind]}?`}
			</Text>
			<Text className="mt-2 text-sm leading-5 text-muted-foreground">{who}</Text>
			{row.kind !== "income" && row.envelope ? (
				<Text className="text-sm leading-5 text-muted-foreground">
					El monto vuelve a {ENVELOPE_LABELS[row.envelope]}.
				</Text>
			) : null}
			{error ? (
				<Text accessibilityRole="alert" className="mt-3 text-[13px] text-warning-foreground">
					{error}
				</Text>
			) : null}
			<View className="mt-6 gap-2">
				<Button label="Eliminar" variant="warning" loading={pending} onPress={onConfirm} />
				<Button label="Cancelar" variant="secondary" disabled={pending} onPress={onCancel} />
			</View>
		</View>
	);
}
