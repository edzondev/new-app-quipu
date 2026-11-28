import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import {
	type Envelope,
	ENVELOPE_LABELS,
	formatCents,
	toCents,
	wholeSoles,
} from "@quipu/backend/shared/budget";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { FullScreenForm, useCloseScreen } from "@/components/ui/full-screen-form";
import { SectionLabel } from "@/components/ui/section-label";
import { Segmented } from "@/components/ui/segmented";
import { WarningTextButton } from "@/components/ui/warning-text-button";
import { type DetectedDraft, parseDetected } from "@/features/detection/params";
import { canEdit, type Row } from "@/features/movements/movement-rows";
import {
	canAddEarlySalary,
	canSaveAmount,
	contributionTodayLine,
	cycleChoices,
	envelopeBalanceCents,
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
	type ExpenseEnvelope,
	expenseTodayLine,
	type IncomeDraft,
	INITIAL_INCOME,
	type MovementKind,
	NOUNS,
	saveLabel,
} from "@/features/register/register";
import { AporteFields, IncomeFields, NoteField } from "@/features/register/register-fields";
import { convex } from "@/lib/convex";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { hasChanges } from "@/lib/has-changes";
import { readError } from "@/lib/read-error";
import { useSingleFlight } from "@/lib/use-single-flight";
import { useThemeColor } from "@/lib/use-theme-color";

/** D4: confirms in the same sheet. Deleting is the form's job: this only shows its state and its error. */
function DeleteFlow({
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

type Id = Row["id"];

type SaveValues =
	| {
			kind: "expense";
			id?: Id;
			amountCents: number;
			envelope: "needs" | "wants";
			note?: string;
	  }
	| {
			kind: "income";
			id?: Id;
			amountCents: number;
			note?: string;
			extra?: FunctionArgs<typeof api.transactions.addIncome>["extra"];
			forNextCycle?: boolean;
	  }
	| {
			kind: "contribution";
			id?: Id;
			amountCents: number;
			envelope: "needs" | "wants";
			toEnvelope: Envelope;
			note?: string;
	  };

type Command = SaveValues | { kind: "delete"; entity: MovementKind; id: Id };

// Registrar works in Personal until Nuestro espacio is connected (its «+» is off there).
const space: "personal" | "household" = "personal";

function send(command: Command) {
	switch (command.kind) {
		case "delete": {
			const { entity, id } = command;
			if (entity === "contribution")
				return convex.mutation(api.transactions.deleteContribution, { id });
			return entity === "expense"
				? convex.mutation(api.transactions.deleteExpense, { space, id })
				: convex.mutation(api.transactions.deleteIncome, { space, id });
		}
		case "expense": {
			const { id, amountCents, envelope, note } = command;
			const base = { space, amountCents, envelope, note };
			return id
				? convex.mutation(api.transactions.updateExpense, { ...base, id })
				: convex.mutation(api.transactions.addExpense, base);
		}
		case "income": {
			const { id, amountCents, note, extra, forNextCycle } = command;
			const base = { space, amountCents, note };
			return id
				? convex.mutation(api.transactions.updateIncome, { ...base, id })
				: convex.mutation(api.transactions.addIncome, { ...base, extra, forNextCycle });
		}
		case "contribution": {
			const { id, amountCents, envelope, toEnvelope, note } = command;
			const base = { amountCents, envelope, toEnvelope, note };
			return id
				? convex.mutation(api.transactions.updateContribution, { ...base, id })
				: convex.mutation(api.transactions.addContribution, base);
		}
	}
}

/** Saves or deletes a movement in Personal. Both resolve to whether it worked; why it did not is in `error`. */
function useMovementActions() {
	const mutation = useMutation({ mutationFn: send });
	const run = useSingleFlight(mutation.mutateAsync);

	return {
		save: (values: SaveValues) => run(values),
		remove: (entity: MovementKind, id: Id) => run({ kind: "delete", entity, id }),
		pending: mutation.isPending,
		error: mutation.error ? readError(mutation.error) : null,
	};
}

type Home = FunctionReturnType<typeof api.balances.getHome>;
type Household = FunctionReturnType<typeof api.household.get>;

const KIND_LABELS: Record<MovementKind, string> = {
	expense: "Gasto",
	income: "Ingreso",
	contribution: "Aporte",
};
const KINDS: readonly MovementKind[] = ["expense", "income"];
const KINDS_WITH_APORTE: readonly MovementKind[] = [...KINDS, "contribution"];

function initialKind(editing: Row | null, detected: DetectedDraft | null): MovementKind {
	const kind = editing?.kind ?? detected?.kind;
	return kind === "income" || kind === "contribution" ? kind : "expense";
}

function formTitle(detected: DetectedDraft | null, editing: Row | null) {
	if (editing) {
		if (editing.kind === "income") return "Editar ingreso";
		return editing.kind === "contribution" ? "Editar aporte" : "Editar gasto";
	}
	if (detected?.kind === "income") return "Registrar ingreso";
	return detected?.kind === "expense" ? "Gasto detectado" : "Registrar";
}

const soles = (cents: number) => wholeSoles(Math.floor(cents / 100) * 100);

function RegisterForm({
	home,
	household,
	today,
	detected,
	editing,
	onClose,
}: {
	/** Both are undefined while they load: the form is usable meanwhile and fills in when they arrive. */
	home: Home | undefined;
	/** Null without a Nuestro espacio: there is no «Aporte» then. */
	household: Household | undefined;
	today: string;
	detected: DetectedDraft | null;
	editing: Row | null;
	onClose: () => void;
}) {
	const [kind, setKind] = useState(initialKind(editing, detected));
	const [amount, setAmount] = useState(
		editing ? formatCents(editing.amountCents) : detected?.cents ? formatCents(detected.cents) : "",
	);
	const [note, setNote] = useState(editing?.note ?? detected?.merchant ?? "");
	const [envelope, setEnvelope] = useState<ExpenseEnvelope>(
		EXPENSE_ENVELOPES.find((name) => name === editing?.envelope) ?? "needs",
	);
	const [toEnvelope, setToEnvelope] = useState<Envelope>(editing?.toEnvelope ?? "needs");
	const [income, setIncome] = useState<IncomeDraft>(INITIAL_INCOME);
	const [deleting, setDeleting] = useState(false);
	const actions = useMovementActions();
	const muted = useThemeColor("--color-muted-foreground");
	const amountCents = toCents(amount);
	const draft = { kind, amount, note, envelope, toEnvelope, income };
	// The first render's draft: what the form opened with.
	const [initial] = useState(draft);
	const changed = hasChanges(initial, draft);

	const kinds = household ? KINDS_WITH_APORTE : KINDS;
	const isNewIncome = kind === "income" && !editing;
	const cycles =
		home &&
		canAddEarlySalary({ isNew: isNewIncome, extra: income.extra, earlyWindow: home.earlyWindow })
			? cycleChoices(home.endDate)
			: null;
	// An older expense moves the free money but not what was spent today.
	const change = {
		amountCents,
		originalCents: editing?.amountCents ?? 0,
		countsToday: !editing || editing.date === today,
	};
	const expenseLine = home && kind === "expense" ? expenseTodayLine(home, change) : null;
	const aporteLine =
		home && kind === "contribution"
			? contributionTodayLine(home, { ...change, countsToday: false })
			: null;

	function succeeded() {
		void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		onClose();
	}

	async function save() {
		// Without Plus an aporte is not saved: the person is taken to the offer, like the web.
		if (kind === "contribution" && household?.plus.active === false) {
			router.replace("/plus?feature=space");
			return;
		}
		const trimmed = note.trim() || undefined;
		const id = editing?.id;
		const values: SaveValues =
			kind === "expense"
				? { kind, id, amountCents, envelope, note: trimmed }
				: kind === "income"
					? {
							kind,
							id,
							amountCents,
							note: trimmed,
							extra: income.extra ?? undefined,
							forNextCycle: cycles ? income.forNextCycle : undefined,
						}
					: // The aporte has no concept in the design: an edit keeps the one it had.
						{ kind, id, amountCents, envelope, toEnvelope, note: editing?.note ?? undefined };
		if (await actions.save(values)) succeeded();
	}

	async function remove() {
		if (editing && (await actions.remove(kind, editing.id))) succeeded();
	}

	return (
		<FullScreenForm
			title={formTitle(detected, editing)}
			sub={detected?.bank}
			changed={changed}
			onClose={onClose}
			footer={
				<Button
					label={
						editing
							? "Guardar cambios"
							: kind === "contribution"
								? "Aportar"
								: saveLabel(cycles, income)
					}
					loading={actions.pending}
					// A new income waits for the cycle: its window decides whether the cycle is asked.
					disabled={
						!canSaveAmount(amountCents) || (isNewIncome && !home) || (editing !== null && !changed)
					}
					onPress={() => void save()}
				/>
			}
		>
			{editing ? null : (
				<View className="mt-2.5">
					<Segmented
						options={kinds.map((name) => KIND_LABELS[name])}
						selectedIndex={kinds.indexOf(kind)}
						onChange={(index) => setKind(kinds[index])}
					/>
				</View>
			)}

			<View className="mt-5 flex-row items-baseline gap-2 border-b border-input pb-2">
				<Text className="font-mono text-[22px] text-muted-foreground">S/</Text>
				<TextInput
					className="min-w-0 flex-1 font-mono text-[46px] leading-none text-foreground"
					keyboardType="decimal-pad"
					autoFocus={!amount}
					value={amount}
					onChangeText={setAmount}
					placeholder="0.00"
					placeholderTextColor={muted}
					accessibilityLabel="Monto"
				/>
			</View>

			{kind === "contribution" ? null : (
				<NoteField
					value={note}
					onChange={setNote}
					placeholder={kind === "expense" ? "Ej. almuerzo" : "Ej. pago de cliente"}
				/>
			)}

			{kind === "expense" ? (
				<>
					<View className="mt-[18px]">
						<SectionLabel>Elige un sobre</SectionLabel>
					</View>
					<View className="mt-2.5 flex-row gap-2">
						{EXPENSE_ENVELOPES.map((name, index) => {
							const selected = name === envelope;
							const balance = home ? soles(envelopeBalanceCents(home, name)) : null;
							return (
								<Pressable
									key={name}
									accessibilityRole="button"
									accessibilityState={{ selected }}
									accessibilityLabel={
										balance === null
											? EXPENSE_ENVELOPE_LABELS[index]
											: `${EXPENSE_ENVELOPE_LABELS[index]}, S/ ${balance}`
									}
									onPress={() => {
										if (selected) return;
										void Haptics.selectionAsync();
										setEnvelope(name);
									}}
									className={`min-h-[52px] min-w-0 flex-1 justify-center rounded-full px-4 ${selected ? "bg-foreground" : "bg-secondary"}`}
								>
									<View className="flex-row items-center gap-2">
										<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[name]}`} />
										<Text
											numberOfLines={1}
											className={`min-w-0 shrink text-[13.5px] font-semibold ${selected ? "text-background" : "text-foreground"}`}
										>
											{EXPENSE_ENVELOPE_LABELS[index]}
										</Text>
									</View>
									{balance === null ? null : (
										<Text
											numberOfLines={1}
											className={`ml-4 font-mono text-[11.5px] opacity-75 ${selected ? "text-background" : "text-foreground"}`}
										>
											S/ {balance}
										</Text>
									)}
								</Pressable>
							);
						})}
					</View>
					{expenseLine ? (
						<Text className="mt-3.5 text-[13px] leading-[19px] text-muted-foreground">
							{expenseLine}
						</Text>
					) : null}
				</>
			) : null}

			{isNewIncome && home ? (
				<IncomeFields
					home={home}
					amountCents={amountCents}
					income={income}
					cycles={cycles}
					onChange={(patch) => setIncome((current) => ({ ...current, ...patch }))}
				/>
			) : null}

			{kind === "contribution" ? (
				<AporteFields
					from={envelope}
					to={toEnvelope}
					line={aporteLine}
					onFromChange={setEnvelope}
					onToChange={setToEnvelope}
				/>
			) : null}

			{actions.error ? (
				<Text accessibilityRole="alert" className="mt-3.5 text-[13px] text-warning-foreground">
					{actions.error}
				</Text>
			) : null}

			{editing ? (
				<>
					<WarningTextButton label={`Eliminar ${NOUNS[kind]}`} onPress={() => setDeleting(true)} />
					<BottomSheet isPresented={deleting} onDismiss={() => setDeleting(false)}>
						<DeleteFlow
							row={editing}
							kind={kind}
							pending={actions.pending}
							error={actions.error}
							onCancel={() => setDeleting(false)}
							onConfirm={() => void remove()}
						/>
					</BottomSheet>
				</>
			) : null}
		</FullScreenForm>
	);
}

/**
 * Reads the cache that Inicio and Movimientos already filled, with the same keys: it opens no cycle and
 * waits for nothing. The form shows at once and the numbers fill in. Only an edit needs its row first.
 */
function RegisterBody({
	today,
	editId,
	detected,
}: {
	today: string;
	editId: string | null;
	detected: DetectedDraft | null;
}) {
	const personal: { space: "personal" | "household"; today: string } = { space: "personal", today };
	const { data: home } = useQuery(convexQuery(api.balances.getHome, personal));
	const { data: household } = useQuery(convexQuery(api.household.get, {}));
	const { data: list } = useQuery(convexQuery(api.transactions.list, editId ? personal : "skip"));

	const found = list?.rows.find((row) => row.id === editId && canEdit(row, "personal")) ?? null;
	// Gone (just deleted here, or from another device) or not editable: the screen closes.
	const close = useCloseScreen(editId !== null && list !== undefined && !found);
	// The last row found stays while the screen slides away, so the form does not blank out under it.
	const [lastFound, setLastFound] = useState(found);
	if (found !== null && found !== lastFound) setLastFound(found);
	const editing = found ?? lastFound;
	// The row is still loading: nothing to edit yet.
	if (editId !== null && !editing) return null;

	return (
		<RegisterForm
			key={`${detected?.cents}-${detected?.merchant}-${editing?.id}`}
			home={home}
			household={household}
			today={today}
			detected={detected}
			editing={editing}
			onClose={close}
		/>
	);
}

export default function RegisterScreen() {
	const params = useLocalSearchParams();
	const detected = parseDetected(params);
	const editId = typeof params.edit === "string" ? params.edit : null;
	// The day is read once, when the screen opens: a change underneath must not wipe what is typed.
	const [today] = useState(getLimaDate);

	return <RegisterBody today={today} editId={editId} detected={detected} />;
}
