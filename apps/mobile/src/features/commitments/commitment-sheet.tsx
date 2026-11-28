import type { api } from "@quipu/backend/convex/_generated/api";
import { NAME_MAX_LENGTH } from "@quipu/backend/shared/budget";
import { dueMonthText, dueMonthTitle } from "@quipu/backend/shared/commitments";
import { formatDay, formatLocalDate, parseLocalDate } from "@quipu/backend/shared/dates";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import type { FunctionReturnType } from "convex/server";
import { type ReactNode, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Chips } from "@/components/ui/chips";
import { OptionList } from "@/components/ui/option-list";
import { SectionLabel } from "@/components/ui/section-label";
import { Segmented } from "@/components/ui/segmented";
import { SheetHeader } from "@/components/ui/sheet-header";
import { SheetViews } from "@/components/ui/sheet-views";
import { TextField } from "@/components/ui/text-field";
import { WarningTextButton } from "@/components/ui/warning-text-button";
import {
	type CommitmentDraft,
	commitmentFields,
	FREQUENCIES,
	FREQUENCY_LABELS,
	initialDraft,
	RULE_KINDS,
	RULE_LABELS,
	ruleAmountOptions,
	thisMonthLine,
} from "@/features/commitments/commitment-form";
import {
	DueMonthList,
	DueMonthRow,
	RemoveConfirm,
} from "@/features/commitments/commitment-actions";
import { useCommitmentActions } from "@/features/commitments/use-commitment-actions";
import { DayRow } from "@/features/cycle/day-row";
import { MoneyField } from "@/features/onboarding/money-field";
import { EXPENSE_ENVELOPE_LABELS, EXPENSE_ENVELOPES } from "@/features/register/expense";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";

type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];

const ENVELOPE_DOTS = EXPENSE_ENVELOPES.map((envelope) => ENVELOPE_DOT[envelope]);
const AMOUNT_TITLES = { day: "Día del mes", beforeEnd: "Días antes del fin" } as const;
const AMOUNT_PLACEHOLDERS = { day: "Día", beforeEnd: "Días" } as const;

function FieldError({ children }: { children: string | undefined }) {
	if (!children) return null;
	return (
		<Text accessibilityRole="alert" className="mt-1.5 text-[13px] text-warning-foreground">
			{children}
		</Text>
	);
}

function Field({ label, children }: { label: string; children: ReactNode }) {
	return (
		<View className="mt-3.5">
			<Text className="text-[13px] text-muted-foreground">{label}</Text>
			{children}
		</View>
	);
}

/**
 * F2: adds a commitment, or edits `item`. The errors show from the first «Guardar» on, like the web.
 * The header stays and only the body changes view, so a day list slides in and out.
 */
export function CommitmentSheet({
	space,
	item,
	today,
	onDone,
}: {
	space: "personal" | "household";
	item: Item | null;
	today: string;
	onDone: () => void;
}) {
	const [draft, setDraft] = useState(initialDraft(item));
	const [submitted, setSubmitted] = useState(false);
	// The draft lives here, not in the views below, so what is typed survives a trip to a list.
	const [picking, setPicking] = useState<"amount" | "date" | "due" | "remove" | null>(null);
	const actions = useCommitmentActions(space);
	const primary = useThemeColor("--color-primary");
	const result = commitmentFields(draft);
	const errors = submitted && !result.ok ? result.errors : {};
	const change = (patch: Partial<CommitmentDraft>) =>
		setDraft((current) => ({ ...current, ...patch }));
	const back = () => setPicking(null);
	const amountKind =
		draft.ruleKind === "day" || draft.ruleKind === "beforeEnd" ? draft.ruleKind : null;
	// The day lists slide in over the form; the date opens the system's picker over the form.
	const view =
		picking === "amount" && amountKind ? "amount" : item && picking === "due" ? "due" : null;

	if (item && picking === "remove") {
		return <RemoveConfirm space={space} item={item} onCancel={back} onDone={onDone} />;
	}

	async function save() {
		setSubmitted(true);
		if (!result.ok) return;
		if (await actions.run({ kind: "save", id: item?.id, fields: result.fields })) onDone();
	}

	const monthLine =
		draft.frequency === "monthly" ? thisMonthLine(draft, item?.adjustment ?? null, today) : null;

	let header: { title: string; sub?: string };
	let body: ReactNode;
	if (view === "amount" && amountKind) {
		header = { title: AMOUNT_TITLES[amountKind] };
		body = (
			<View className="mt-1.5">
				<OptionList
					options={ruleAmountOptions(amountKind)}
					value={draft.ruleAmount}
					onPick={(ruleAmount) => {
						change({ ruleAmount });
						back();
					}}
				/>
			</View>
		);
	} else if (view === "due" && item) {
		const month = item.dueDate.slice(0, 7);
		header = {
			title: dueMonthTitle(month, today),
			sub: item.rule ? dueMonthText(month, item.rule) : undefined,
		};
		body = <DueMonthList space={space} item={item} onDone={back} />;
	} else {
		header = { title: item ? "Editar compromiso" : "Nuevo compromiso" };
		body = (
			<View>
				<View className="mt-2">
					<Segmented
						options={FREQUENCY_LABELS}
						selectedIndex={FREQUENCIES.indexOf(draft.frequency)}
						onChange={(index) => change({ frequency: FREQUENCIES[index] })}
					/>
				</View>

				<Field label="Nombre">
					<TextField
						value={draft.name}
						onChangeText={(name) => change({ name })}
						placeholder="ej. Luz del Sur"
						maxLength={NAME_MAX_LENGTH}
						accessibilityLabel="Nombre"
					/>
					<FieldError>{errors.name}</FieldError>
				</Field>

				<View className="mt-2">
					<MoneyField
						label="Monto"
						value={draft.amount}
						onChange={(amount) => change({ amount })}
						invalid={Boolean(errors.amount)}
					/>
					<FieldError>{errors.amount}</FieldError>
				</View>

				{draft.frequency === "monthly" ? (
					<Field label="Vence">
						<View className="mt-2.5">
							<Chips
								options={RULE_LABELS}
								selectedIndex={RULE_KINDS.indexOf(draft.ruleKind)}
								onChange={(index) => change({ ruleKind: RULE_KINDS[index], ruleAmount: "" })}
							/>
						</View>
						{amountKind ? (
							<DayRow
								label={AMOUNT_TITLES[amountKind]}
								value={
									ruleAmountOptions(amountKind).find((option) => option.value === draft.ruleAmount)
										?.label ?? AMOUNT_PLACEHOLDERS[amountKind]
								}
								accessibilityLabel={`${AMOUNT_TITLES[amountKind]}. Cambiar`}
								onPress={() => setPicking("amount")}
							/>
						) : null}
						{monthLine ? (
							<Text className="mt-1 text-[13px] text-muted-foreground">{monthLine}</Text>
						) : null}
						{item ? (
							<DueMonthRow item={item} today={today} onPress={() => setPicking("due")} />
						) : null}
					</Field>
				) : (
					<DayRow
						label="Vence"
						value={draft.date ? formatDay(draft.date) : "Fecha"}
						accessibilityLabel="Vence. Cambiar"
						onPress={() => setPicking("date")}
					/>
				)}
				<FieldError>{errors.due}</FieldError>

				<View className="mt-3.5">
					<SectionLabel>Sale de</SectionLabel>
					<View className="mt-2.5">
						<Chips
							options={EXPENSE_ENVELOPE_LABELS}
							dots={ENVELOPE_DOTS}
							selectedIndex={EXPENSE_ENVELOPES.indexOf(draft.envelope)}
							onChange={(index) => change({ envelope: EXPENSE_ENVELOPES[index] })}
						/>
					</View>
				</View>

				<FieldError>{actions.error ?? undefined}</FieldError>

				<View className="mt-[18px] mb-2">
					<Button
						label={item ? "Guardar cambios" : "Guardar compromiso"}
						loading={actions.pending}
						onPress={() => void save()}
					/>
					{item ? (
						<WarningTextButton label="Borrar compromiso" onPress={() => setPicking("remove")} />
					) : null}
				</View>
			</View>
		);
	}

	return (
		<View>
			<SheetHeader {...header} onBack={view ? back : undefined} />
			<SheetViews view={view}>{body}</SheetViews>

			{picking === "date" ? (
				<DateTimePicker
					mode="date"
					// A one-off is due today or later, like the web's calendar.
					value={parseLocalDate(draft.date || today)}
					minimumDate={parseLocalDate(today)}
					accentColor={primary}
					onValueChange={(_, picked) => {
						setPicking(null);
						change({ date: formatLocalDate(picked) });
					}}
					onDismiss={() => setPicking(null)}
				/>
			) : null}
		</View>
	);
}
