import { formatCents, toCents, wholeSoles } from "@quipu/backend/shared/budget";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { SheetHeader } from "@/components/ui/sheet-header";
import { WarningTextButton } from "@/components/ui/warning-text-button";
import { MoneyField } from "@/features/onboarding/money-field";
import { ConfirmView, WarningText } from "./confirm-view";
import { useSavingActions } from "./use-saving-actions";

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
