import DateTimePicker from "@expo/ui/community/datetime-picker";
import type { api } from "@quipu/backend/convex/_generated/api";
import {
	ENVELOPE_LABELS,
	formatCents,
	NAME_MAX_LENGTH,
	toCents,
} from "@quipu/backend/shared/budget";
import { dueMonthText, dueMonthTitle } from "@quipu/backend/shared/commitments";
import { formatDay, formatLocalDate, parseLocalDate } from "@quipu/backend/shared/dates";
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
import { DayRow } from "@/features/cycle/day-row";
import { MoneyField } from "@/features/onboarding/money-field";
import {
	canSaveAmount,
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
} from "@/features/register/register";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";
import {
	type CommitmentDraft,
	commitmentFields,
	FREQUENCIES,
	FREQUENCY_LABELS,
	initialDraft,
	monthDayOptions,
	paidBeforeLine,
	payHeading,
	RULE_KINDS,
	RULE_LABELS,
	ruleAmountOptions,
	thisMonthLine,
} from "./commitments";
import { useCommitmentActions } from "./use-commitment-actions";

type Space = "personal" | "household";
type Item = FunctionReturnType<typeof api.commitments.list>["items"][number];

const dueDay = (item: Item) => String(Number(item.dueDate.slice(8)));

function ErrorLine({ error }: { error: string | null }) {
	if (!error) return null;
	return (
		<Text accessibilityRole="alert" className="mt-3 text-[13px] text-warning-foreground">
			{error}
		</Text>
	);
}

/** «Este mes vence… › Día 28», only for a monthly: it opens the days of the charge's month. */
function DueMonthRow({ item, today, onPress }: { item: Item; today: string; onPress: () => void }) {
	if (!item.rule) return null;
	const title = dueMonthTitle(item.dueDate.slice(0, 7), today);
	return (
		<DayRow
			label={title}
			value={`Día ${dueDay(item)}`}
			accessibilityLabel={`${title} Día ${dueDay(item)}. Cambiar`}
			onPress={onPress}
		/>
	);
}

/**
 * Any day of the charge's month, also a past one, like the web's calendar. It saves on the pick.
 * Its title and text (`dueMonthTitle`, `dueMonthText`) go in the sheet's header, which stays in place.
 */
function DueMonthList({ space, item, onDone }: { space: Space; item: Item; onDone: () => void }) {
	const actions = useCommitmentActions(space);
	const month = item.dueDate.slice(0, 7);
	if (!item.rule) return null;

	async function pick(day: string) {
		if (await actions.run({ kind: "setDue", id: item.id, month, day: Number(day) })) onDone();
	}

	return (
		<View>
			<View className="mt-1.5">
				<OptionList
					options={monthDayOptions(month)}
					value={dueDay(item)}
					onPick={(day) => void pick(day)}
				/>
			</View>
			<ErrorLine error={actions.error} />
		</View>
	);
}

/** The web's confirmation, in the same sheet like D4. */
function RemoveConfirm({
	space,
	item,
	onCancel,
	onDone,
}: {
	space: Space;
	item: Item;
	onCancel: () => void;
	onDone: () => void;
}) {
	const actions = useCommitmentActions(space);

	async function remove() {
		if (await actions.run({ kind: "remove", id: item.id })) onDone();
	}

	return (
		<View>
			<Text className="text-[28px] leading-8 font-semibold text-foreground">
				¿Borrar el compromiso?
			</Text>
			<Text className="mt-2 text-sm leading-5 text-muted-foreground">
				«{item.name}» deja de reservar dinero. Los pagos que ya hiciste se quedan en Movimientos.
			</Text>
			<ErrorLine error={actions.error} />
			<View className="mt-6 mb-2 gap-2">
				<Button
					label="Borrar compromiso"
					variant="warning"
					loading={actions.pending}
					onPress={() => void remove()}
				/>
				<Button
					label="Mantener compromiso"
					variant="secondary"
					disabled={actions.pending}
					onPress={onCancel}
				/>
			</View>
		</View>
	);
}

type PaidItem = Extract<Item, { status: "paid" }>;

/** A paid commitment cannot be edited (the web hides «Editar»): it shows as it is, with its actions. */
export function PaidSheet({
	space,
	item,
	today,
	onDone,
}: {
	space: "personal" | "household";
	item: PaidItem;
	today: string;
	onDone: () => void;
}) {
	const [removing, setRemoving] = useState(false);

	if (removing) {
		return (
			<RemoveConfirm
				space={space}
				item={item}
				onCancel={() => setRemoving(false)}
				onDone={onDone}
			/>
		);
	}

	return (
		<View>
			<SheetHeader title={item.name} sub={paidBeforeLine(item, today)} />
			<Text className="mt-2 font-mono text-[34px] tracking-tight text-foreground">
				S/ {formatCents(item.amountCents)}
			</Text>
			<View className="my-2">
				<WarningTextButton label="Borrar compromiso" onPress={() => setRemoving(true)} />
			</View>
		</View>
	);
}

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
