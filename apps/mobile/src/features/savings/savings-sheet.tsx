import type { api } from "@quipu/backend/convex/_generated/api";
import { formatCents, NOTE_MAX_LENGTH, wholeSoles } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { SectionLabel } from "@/components/ui/section-label";
import { SheetHeader } from "@/components/ui/sheet-header";
import { TextField } from "@/components/ui/text-field";
import { WarningTextButton } from "@/components/ui/warning-text-button";
import type { Row } from "@/features/movements/movement-rows";
import { MoneyField } from "@/features/onboarding/money-field";
import { PlusContent } from "@/features/plus/plus-sheet";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { ConfirmView, WarningText } from "./confirm-view";
import { FundGoalSheet, GoalSheet } from "./goal-sheet";
import {
	contributeAvailable,
	contributeCents,
	contributeShortcut,
	overAhorroText,
	overFundText,
	QUICK_CENTS,
	REASON_LABELS,
	REASONS,
	singleLine,
	withdrawAvailable,
	type WithdrawDraft,
	withdrawFields,
} from "./savings";
import { useSavingActions } from "./use-saving-actions";

type Fund = FunctionReturnType<typeof api.goals.fund>;
type Goal = FunctionReturnType<typeof api.goals.list>[number];

/**
 * G3 and G7: saves to `goal`, or to the fund without one. Only from the cycle's Ahorro (G7e). With `editing`
 * it changes or deletes that saving: its destination and note stay, and its amount counts as available.
 */
function ContributeSheet({
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
				{editing ? <WarningTextButton label="Eliminar" onPress={() => setDeleting(true)} /> : null}
			</View>
		</View>
	);
}

const REASON_OPTIONS = REASONS.map((reason) => REASON_LABELS[reason]);

/** G5: takes money out of the fund into this cycle's Necesidades. With `editing` it changes or deletes it. */
function WithdrawSheet({
	space,
	fundCents,
	editing,
	onDone,
}: {
	space: "personal" | "household";
	fundCents: number;
	editing: Row | null;
	onDone: () => void;
}) {
	const [draft, setDraft] = useState<WithdrawDraft>({
		amount: editing ? formatCents(editing.amountCents) : "",
		reason: editing?.reason ?? "emergency",
		note: editing?.note ?? "",
	});
	const [deleting, setDeleting] = useState(false);
	const actions = useSavingActions(space);
	const available = withdrawAvailable(fundCents, editing?.amountCents);
	const fields = withdrawFields(draft, available);
	const over = overFundText(draft.amount, available);
	const change = (patch: Partial<WithdrawDraft>) =>
		setDraft((current) => ({ ...current, ...patch }));

	async function save() {
		if (!fields) return;
		const ok = editing
			? await actions.run({ kind: "updateWithdrawal", id: editing.id, ...fields })
			: await actions.run({ kind: "withdraw", ...fields });
		if (ok) onDone();
	}

	async function remove() {
		if (editing && (await actions.run({ kind: "deleteWithdrawal", id: editing.id }))) onDone();
	}

	if (deleting) {
		return (
			<ConfirmView
				title="¿Eliminar este retiro?"
				body={null}
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
			<SheetHeader title="Retirar del fondo" sub={`Tienes S/ ${wholeSoles(available)}`} />
			<Text className="mt-2.5 text-[13px] text-muted-foreground">Monto a retirar</Text>
			<MoneyField
				large
				label="Monto a retirar"
				value={draft.amount}
				onChange={(amount) => change({ amount })}
				invalid={over !== null}
			/>
			<WarningText>{over}</WarningText>
			<View className="mt-3.5">
				<SectionLabel>Motivo</SectionLabel>
				<View className="mt-2.5">
					<Chips
						options={REASON_OPTIONS}
						selectedIndex={REASONS.indexOf(draft.reason)}
						onChange={(index) => change({ reason: REASONS[index] })}
					/>
				</View>
			</View>
			{draft.reason === "other" ? (
				<View className="mt-3">
					<TextField
						value={draft.note}
						onChangeText={(note) => change({ note: singleLine(note) })}
						placeholder="¿Para qué?"
						maxLength={NOTE_MAX_LENGTH}
						accessibilityLabel="¿Para qué?"
					/>
				</View>
			) : null}
			<View className="mt-4 flex-row items-start gap-2.5">
				<View className={`mt-1.5 size-2 shrink-0 rounded-full ${ENVELOPE_DOT.needs}`} />
				<Text className="min-w-0 flex-1 text-[13px] leading-[19px] text-muted-foreground">
					Pasa a Necesidades de este ciclo.
				</Text>
			</View>
			<WarningText>{actions.error}</WarningText>
			<View className="mt-[18px] mb-2">
				<Button
					label={editing ? "Guardar" : "Confirmar"}
					loading={actions.pending}
					disabled={!fields}
					onPress={() => void save()}
				/>
				{editing ? <WarningTextButton label="Eliminar" onPress={() => setDeleting(true)} /> : null}
			</View>
		</View>
	);
}

/** A row of Movimientos opens Aportar or Retirar in edit mode. The destination shows and does not change. */
export function EditSavingSheet({
	space,
	row,
	fund,
	goals,
	savingsCents,
	onDone,
}: {
	space: "personal" | "household";
	row: Row;
	fund: Fund;
	goals: Goal[];
	savingsCents: number;
	onDone: () => void;
}) {
	if (row.kind === "withdrawal") {
		return <WithdrawSheet space={space} fundCents={fund.fundCents} editing={row} onDone={onDone} />;
	}
	// A deleted goal leaves its savings in the fund, so the row has no goal anymore.
	const goal = goals.find((item) => item.id === row.goalId) ?? null;
	return (
		<ContributeSheet
			space={space}
			savingsCents={savingsCents}
			fund={fund}
			goal={goal}
			editing={row}
			onDone={onDone}
		/>
	);
}

/** What the one sheet of Ahorros shows. `goalId: null` is the fund (contribute) or a new goal. */
export type SavingsPanel =
	| { kind: "contribute" | "goal"; goalId: Goal["id"] | null }
	| { kind: "withdraw" | "fundGoal" | "plus" };

/** The content of the sheet for `panel`. `goal` is the one the panel points to, read from the live list. */
export function SavingsSheet({
	space,
	today,
	panel,
	goal,
	fund,
	savingsCents,
	onDone,
	onTrial,
}: {
	space: "personal" | "household";
	today: string;
	panel: SavingsPanel;
	goal: Goal | null;
	fund: Fund;
	savingsCents: number;
	onDone: () => void;
	onTrial: (endsAt: number) => void;
}) {
	switch (panel.kind) {
		case "contribute":
			return (
				<ContributeSheet
					space={space}
					savingsCents={savingsCents}
					fund={fund}
					goal={goal}
					editing={null}
					onDone={onDone}
				/>
			);
		case "withdraw":
			return (
				<WithdrawSheet space={space} fundCents={fund.fundCents} editing={null} onDone={onDone} />
			);
		case "fundGoal":
			return (
				<FundGoalSheet
					space={space}
					fundGoalCents={fund.fundGoalCents}
					suggestedCents={fund.suggestedFundGoalCents}
					onDone={onDone}
				/>
			);
		case "goal":
			return (
				<GoalSheet space={space} goal={goal} today={today} onDone={onDone} onTrial={onTrial} />
			);
		case "plus":
			return <PlusContent feature="goals" onClose={onDone} onTrial={onTrial} />;
	}
}
