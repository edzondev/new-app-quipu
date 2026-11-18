import {
	describePayday,
	FREQUENCIES,
	FREQUENCY_LABELS,
	type Frequency,
	type getCyclePlan,
	getStartDayLabel,
	getStartDayTitle,
} from "@quipu/backend/shared/start-day";
import * as Haptics from "expo-haptics";
import { Text, View } from "react-native";
import Check from "reicon-react-native/icons/Check";
import { PressableScale } from "@/components/ui/pressable-scale";
import { DayRow } from "@/features/cycle/day-row";
import { useThemeColor } from "@/lib/use-theme-color";
import { MoneyField } from "./money-field";

export function StepCycle({
	frequency,
	onFrequency,
	plan,
	onOpenDay,
	incomeText,
	incomeError,
	onIncome,
}: {
	frequency: Frequency | "";
	onFrequency: (frequency: Frequency) => void;
	plan: ReturnType<typeof getCyclePlan> | null;
	onOpenDay: () => void;
	incomeText: string;
	incomeError: string | null;
	onIncome: (text: string) => void;
}) {
	const background = useThemeColor("--color-background");

	return (
		<View>
			<Text className="text-[32px] leading-[35px] font-semibold text-foreground">
				¿Cada cuánto te pagan?
			</Text>
			<View
				accessibilityRole="radiogroup"
				accessibilityLabel="Cada cuánto te pagan"
				className="mt-5 flex-row flex-wrap gap-2"
			>
				{FREQUENCIES.map((value) => {
					const checked = frequency === value;
					return (
						<PressableScale
							key={value}
							scale={0.985}
							accessibilityRole="radio"
							accessibilityState={{ checked }}
							onPress={() => {
								if (checked) return;
								void Haptics.selectionAsync();
								onFrequency(value);
							}}
							className={`min-h-[52px] w-[48.5%] flex-row items-center gap-2 rounded-[14px] ${checked ? "border-2 border-foreground bg-muted px-2.5" : "border border-input px-[11px]"}`}
						>
							<View
								className={`size-5 items-center justify-center rounded-full ${checked ? "bg-foreground" : "border-[1.5px] border-muted-foreground"}`}
							>
								{checked ? <Check size={12} color={background} /> : null}
							</View>
							<Text className="min-w-0 shrink text-sm leading-[17px] font-semibold text-foreground">
								{FREQUENCY_LABELS[value]}
							</Text>
						</PressableScale>
					);
				})}
			</View>

			{plan && plan.frequency !== "variable" ? (
				<>
					<Text className="mt-[18px] text-[13.5px] font-medium text-muted-foreground">
						{getStartDayTitle(plan.cadence)}
					</Text>
					<View className="mt-0.5">
						<DayRow
							label={getStartDayLabel(plan.cadence, plan.cycleStartDay)}
							value="Cambiar"
							accessibilityLabel={`${getStartDayTitle(plan.cadence)} ${getStartDayLabel(plan.cadence, plan.cycleStartDay)}. Cambiar`}
							onPress={onOpenDay}
						/>
					</View>
				</>
			) : null}

			{/* The region stays mounted so a screen reader announces what appears in it. */}
			<View
				accessibilityLiveRegion="polite"
				className={plan ? "mt-3 rounded-2xl bg-muted px-3.5 py-3" : undefined}
			>
				{plan ? (
					<>
						<Text className="text-[15px] leading-[20px] font-semibold text-foreground">
							{describePayday(plan.frequency, plan.cycleStartDay)}
						</Text>
						<Text className="mt-1 text-xs text-muted-foreground">
							Tu primer ciclo{"  "}
							<Text className="font-mono text-sm text-foreground">{plan.firstCycle}</Text>
						</Text>
						{plan.frequency === "variable" ? (
							<Text className="mt-1 text-xs text-muted-foreground">Lo cambias en Ajustes.</Text>
						) : null}
					</>
				) : null}
			</View>

			{plan && plan.frequency !== "variable" ? (
				<>
					<Text className="mt-[18px] text-[13.5px] font-medium text-muted-foreground">
						¿Cuánto te pagan? · opcional
					</Text>
					<MoneyField
						value={incomeText}
						onChange={onIncome}
						label="Cuánto te pagan, opcional"
						invalid={incomeError !== null}
					/>
					<Text className="mt-1.5 text-xs text-muted-foreground">Si varía, déjalo vacío.</Text>
					{incomeError ? (
						<Text accessibilityRole="alert" className="mt-1.5 text-[13px] text-warning-foreground">
							{incomeError}
						</Text>
					) : null}
				</>
			) : null}
		</View>
	);
}
