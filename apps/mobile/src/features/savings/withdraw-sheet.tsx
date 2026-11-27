import { formatCents, NOTE_MAX_LENGTH, wholeSoles } from "@quipu/backend/shared/budget";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { SectionLabel } from "@/components/ui/section-label";
import { SheetHeader } from "@/components/ui/sheet-header";
import { TextField } from "@/components/ui/text-field";
import type { Row } from "@/features/movements/movement-rows";
import { MoneyField } from "@/features/onboarding/money-field";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { ConfirmView, WarningLink, WarningText } from "./confirm-view";
import { singleLine } from "./goal-form";
import { useSavingActions } from "./use-saving-actions";
import {
	overFundText,
	REASON_LABELS,
	REASONS,
	type WithdrawDraft,
	withdrawAvailable,
	withdrawFields,
} from "./withdraw-form";

const REASON_OPTIONS = REASONS.map((reason) => REASON_LABELS[reason]);

/** G5: takes money out of the fund into this cycle's Necesidades. With `editing` it changes or deletes it. */
export function WithdrawSheet({
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
				{editing ? <WarningLink label="Eliminar" onPress={() => setDeleting(true)} /> : null}
			</View>
		</View>
	);
}
