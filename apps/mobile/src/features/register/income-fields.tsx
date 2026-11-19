import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import * as Haptics from "expo-haptics";
import { Pressable, Switch, Text, View } from "react-native";
import { Chips } from "@/components/ui/chips";
import { Notice } from "@/components/ui/notice";
import { SectionLabel } from "@/components/ui/section-label";
import {
	type CycleChoices,
	DESTINATIONS,
	EXTRA_TYPE_OPTIONS,
	EXTRA_TYPES,
	INCOME_KINDS,
	type IncomeDraft,
	incomeSplitLine,
	incomeTodayLine,
	NEW_EXTRA,
	savingsLine,
	START_NOW_NOTE,
} from "@/features/register/income";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { useThemeColor } from "@/lib/use-theme-color";

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
	const primary = useThemeColor("--color-primary");
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
					{income.forNextCycle ? (
						<View className="mt-1 min-h-14 flex-row items-center gap-3 py-2">
							<View className="min-w-0 flex-1">
								<Text className="text-[15px] font-semibold text-foreground">Empezar ciclo hoy</Text>
								<Text className="mt-0.5 text-[12.5px] leading-[18px] text-muted-foreground">
									{income.startNow ? START_NOW_NOTE : cycles.startsOn}
								</Text>
							</View>
							<Switch
								value={income.startNow}
								onValueChange={(startNow) => onChange({ startNow })}
								trackColor={{ true: primary }}
								accessibilityLabel="Empezar ciclo hoy"
							/>
						</View>
					) : null}
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
