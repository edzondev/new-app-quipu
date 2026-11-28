import type { api } from "@quipu/backend/convex/_generated/api";
import { type Envelope, ENVELOPE_LABELS, NOTE_MAX_LENGTH } from "@quipu/backend/shared/budget";
import type { FunctionReturnType } from "convex/server";
import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
import { Chips } from "@/components/ui/chips";
import { Notice } from "@/components/ui/notice";
import { SectionLabel } from "@/components/ui/section-label";
import { TextField } from "@/components/ui/text-field";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import {
	type CycleChoices,
	DESTINATIONS,
	EXPENSE_ENVELOPE_LABELS,
	EXPENSE_ENVELOPES,
	type ExpenseEnvelope,
	EXTRA_TYPE_OPTIONS,
	EXTRA_TYPES,
	INCOME_KINDS,
	type IncomeDraft,
	incomeSplitLine,
	incomeTodayLine,
	NEW_EXTRA,
	savingsLine,
} from "./register";

/** D1: «Concepto · opcional», always visible under the amount. */
export function NoteField({
	value,
	onChange,
	placeholder,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
}) {
	return (
		<View className="mt-3">
			<Text className="text-[13px] text-muted-foreground">Concepto · opcional</Text>
			<TextField
				value={value}
				onChangeText={onChange}
				placeholder={placeholder}
				maxLength={NOTE_MAX_LENGTH}
				accessibilityLabel="Concepto"
			/>
		</View>
	);
}

const TARGETS = ["needs", "wants", "savings"] as const satisfies readonly Envelope[];
const TARGET_LABELS = TARGETS.map((envelope) => ENVELOPE_LABELS[envelope]);

/** J9: an aporte leaves Necesidades or Gustos and enters any envelope of Nuestro espacio. */
export function AporteFields({
	from,
	to,
	line,
	onFromChange,
	onToChange,
}: {
	from: ExpenseEnvelope;
	to: Envelope;
	line: string | null;
	onFromChange: (envelope: ExpenseEnvelope) => void;
	onToChange: (envelope: Envelope) => void;
}) {
	return (
		<View>
			<View className="mt-[18px]">
				<SectionLabel>Sale de</SectionLabel>
			</View>
			<View className="mt-2.5">
				<Chips
					options={EXPENSE_ENVELOPE_LABELS}
					selectedIndex={EXPENSE_ENVELOPES.indexOf(from)}
					onChange={(index) => onFromChange(EXPENSE_ENVELOPES[index])}
				/>
			</View>
			<View className="mt-[18px]">
				<SectionLabel>Entra a · Nuestro espacio</SectionLabel>
			</View>
			<View className="mt-2.5">
				<Chips
					options={TARGET_LABELS}
					selectedIndex={TARGETS.indexOf(to)}
					onChange={(index) => onToChange(TARGETS[index])}
				/>
			</View>
			{line ? (
				<Text className="mt-3.5 text-[13px] leading-[19px] text-muted-foreground">{line}</Text>
			) : null}
		</View>
	);
}

type Home = FunctionReturnType<typeof api.balances.getHome>;

const DESTINATION_DOTS = [undefined, ENVELOPE_DOT.savings] as const;

function RadioRow({
	label,
	selected,
	onSelect,
}: {
	label: string;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			onPress={() => {
				if (selected) return;
				void Haptics.selectionAsync();
				onSelect();
			}}
			className="min-h-11 flex-row items-center gap-3 py-2 active:opacity-60"
		>
			<View
				className={`size-[22px] items-center justify-center rounded-full border-[1.5px] ${selected ? "border-foreground" : "border-input"}`}
			>
				{selected ? <View className="size-3 rounded-full bg-foreground" /> : null}
			</View>
			<Text className="min-w-0 flex-1 text-[15px] leading-5 text-foreground">{label}</Text>
		</Pressable>
	);
}

export function IncomeFields({
	home,
	amountCents,
	income,
	cycles,
	onChange,
}: {
	home: Home;
	amountCents: number;
	income: IncomeDraft;
	cycles: CycleChoices | null;
	onChange: (patch: Partial<IncomeDraft>) => void;
}) {
	const { extra } = income;
	const line = extra?.toSavings
		? savingsLine(home, amountCents)
		: incomeTodayLine(home, amountCents);

	return (
		<View>
			<View className="mt-4">
				<Chips
					options={INCOME_KINDS}
					selectedIndex={extra ? 1 : 0}
					onChange={(index) => onChange({ extra: index === 1 ? NEW_EXTRA : null })}
				/>
			</View>

			{extra ? (
				<>
					<View className="mt-[18px]">
						<SectionLabel>Tipo</SectionLabel>
					</View>
					<View className="mt-2.5">
						<Chips
							options={EXTRA_TYPE_OPTIONS}
							selectedIndex={EXTRA_TYPES.indexOf(extra.type)}
							onChange={(index) => onChange({ extra: { ...extra, type: EXTRA_TYPES[index] } })}
						/>
					</View>
					<View className="mt-[18px]">
						<SectionLabel>¿A dónde va?</SectionLabel>
					</View>
					<View className="mt-2.5">
						<Chips
							options={DESTINATIONS}
							dots={DESTINATION_DOTS}
							selectedIndex={extra.toSavings ? 1 : 0}
							onChange={(index) => onChange({ extra: { ...extra, toSavings: index === 1 } })}
						/>
					</View>
				</>
			) : null}

			{cycles ? (
				<>
					<Text className="mt-4 text-[13px] leading-[19px] text-muted-foreground">
						{cycles.prompt}
					</Text>
					<View accessibilityRole="radiogroup" className="mt-1">
						{cycles.options.map((label, index) => (
							<RadioRow
								key={label}
								label={label}
								selected={income.forNextCycle === (index === 1)}
								onSelect={() => onChange({ forNextCycle: index === 1 })}
							/>
						))}
					</View>
				</>
			) : (
				<>
					{extra ? null : (
						<View className="mt-4">
							<Notice>{incomeSplitLine(home.split)}</Notice>
						</View>
					)}
					{line ? (
						<Text className="mt-3.5 text-[13px] leading-[19px] text-muted-foreground">{line}</Text>
					) : null}
				</>
			)}
		</View>
	);
}
