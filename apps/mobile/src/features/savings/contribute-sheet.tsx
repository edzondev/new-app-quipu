import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, wholeSoles } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { SheetHeader } from "@/components/ui/sheet-header";
import type { Row } from "@/features/movements/movement-rows";
import { MoneyField } from "@/features/onboarding/money-field";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { ConfirmView, WarningLink, WarningText } from "./confirm-view";
import {
	contributeAvailable,
	contributeCents,
	contributeShortcut,
	overAhorroText,
	QUICK_CENTS,
} from "./contribute-form";
import { useSavingActions } from "./use-saving-actions";

type Fund = FunctionReturnType<typeof api.goals.fund>;
type Goal = FunctionReturnType<typeof api.goals.list>[number];

/**
 * G3 and G7: saves to `goal`, or to the fund without one. Only from the cycle's Ahorro (G7e). With `editing`
 * it changes or deletes that saving: its destination and note stay, and its amount counts as available.
 */
export function ContributeSheet({
	space,
	savingsCents,
	fund,
	goal,
	editing,
	onDone,
}: {
	space: "personal" | "household";
	savingsCents: number;
	fund: Pick<Fund, "fundCents" | "fundGoalCents">;
	goal: Goal | null;
	editing: Row | null;
	onDone: () => void;
}) {
	const [amount, setAmount] = useState(editing ? formatCents(editing.amountCents) : "");
	const [deleting, setDeleting] = useState(false);
	const actions = useSavingActions(space);
	const available = contributeAvailable(savingsCents, editing?.amountCents);
	const cents = contributeCents(amount, available);
	const over = overAhorroText(amount, available);
	const shortcut = contributeShortcut(goal, available);
	const quick = [{ label: "S/ 100", cents: QUICK_CENTS }, ...(shortcut ? [shortcut] : [])];
	const savedCents = goal?.savedCents ?? fund.fundCents;
	const targetCents = goal ? goal.targetCents : fund.fundGoalCents;

	async function save() {
		if (cents === null) return;
		const ok = editing
			? await actions.run({
					kind: "updateSaving",
					id: editing.id,
					amountCents: cents,
					note: editing.note ?? undefined,
				})
			: await actions.run({ kind: "addSaving", amountCents: cents, goalId: goal?.id });
		if (ok) onDone();
	}

	async function remove() {
		if (editing && (await actions.run({ kind: "deleteSaving", id: editing.id }))) onDone();
	}

	if (deleting) {
		return (
			<ConfirmView
				title="¿Eliminar este ahorro?"
				body="El monto vuelve a su sobre."
				confirmLabel="Eliminar"
				cancelLabel="Cancelar"
				pending={actions.pending}
				error={actions.error}
				onConfirm={() => void remove()}
				onCancel={() => setDeleting(false)}
			/>
		);
	}

	return (
		<View>
			<SheetHeader
				title={goal ? `Aportar a ${goal.name}` : "Aportar al fondo"}
				sub={`S/ ${wholeSoles(savedCents)}${targetCents ? ` de S/ ${wholeSoles(targetCents)}` : ""}`}
			/>
			<View className="mt-2">
				<MoneyField
					large
					label="Monto"
					value={amount}
					onChange={setAmount}
					invalid={over !== null}
				/>
			</View>
			{over ? (
				<WarningText>{over}</WarningText>
			) : goal ? null : (
				<Text className="mt-3 text-[13px] text-muted-foreground">
					Tienes S/ {formatCents(available)} en Ahorro este ciclo.
				</Text>
			)}
			<View className="mt-3.5">
				<Chips
					options={quick.map((option) => option.label)}
					selectedIndex={-1}
					onChange={(index) => setAmount(formatCents(quick[index].cents))}
				/>
			</View>
			<View className="mt-4 flex-row items-start gap-2.5">
				<View className={`mt-1.5 size-2 shrink-0 rounded-full ${ENVELOPE_DOT.savings}`} />
				<Text className="min-w-0 flex-1 text-[13px] leading-[19px] text-muted-foreground">
					Sale del sobre Ahorro. No cuenta como gasto.
				</Text>
			</View>
			<WarningText>{actions.error}</WarningText>
			<View className="mt-[18px] mb-2">
				<Button
					label={editing ? "Guardar" : "Aportar"}
					loading={actions.pending}
					disabled={cents === null}
					onPress={() => void save()}
				/>
				{editing ? <WarningLink label="Eliminar" onPress={() => setDeleting(true)} /> : null}
			</View>
		</View>
	);
}
