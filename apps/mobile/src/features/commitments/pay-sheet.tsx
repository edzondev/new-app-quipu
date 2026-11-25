import type { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, formatCents, toCents } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { SheetHeader } from "@/components/ui/sheet-header";
import { payHeading } from "@/features/commitments/commitment-text";
import { useCommitmentActions } from "@/features/commitments/use-commitment-actions";
import { MoneyField } from "@/features/onboarding/money-field";
import { canSaveAmount } from "@/features/register/expense";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";

type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];

/** F3: the amount comes filled and can change, like the web; the payment is a movement in its envelope. */
export function PaySheet({
	space,
	item,
	today,
	onDone,
}: {
	space: "personal" | "household";
	item: Item;
	today: string;
	onDone: () => void;
}) {
	const [amount, setAmount] = useState(formatCents(item.amountCents));
	const actions = useCommitmentActions(space);
	const amountCents = toCents(amount);

	async function pay() {
		if (await actions.run({ kind: "pay", id: item.id, amountCents })) onDone();
	}

	return (
		<View>
			<SheetHeader title="Marcar pagado" sub={payHeading(item, today)} />
			<Text className="mt-2.5 text-[13px] text-muted-foreground">Monto pagado</Text>
			<MoneyField large label="Monto pagado" value={amount} onChange={setAmount} />
			<View className="mt-4 flex-row items-start gap-2.5">
				<View className={`mt-1.5 size-2 shrink-0 rounded-full ${ENVELOPE_DOT[item.envelope]}`} />
				<Text className="min-w-0 flex-1 text-[13px] leading-[19px] text-muted-foreground">
					Se registra un movimiento en {ENVELOPE_LABELS[item.envelope]}.
				</Text>
			</View>
			{actions.error ? (
				<Text accessibilityRole="alert" className="mt-3.5 text-[13px] text-warning-foreground">
					{actions.error}
				</Text>
			) : null}
			<View className="mt-[18px] mb-2">
				<Button
					label="Marcar pagado"
					loading={actions.pending}
					disabled={!canSaveAmount(amountCents)}
					onPress={() => void pay()}
				/>
			</View>
		</View>
	);
}
