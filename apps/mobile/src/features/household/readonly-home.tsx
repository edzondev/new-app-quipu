import { formatDaysLeft, formatRange } from "@quipu/backend/shared/dates";
import { router } from "expo-router";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/ui/pressable-scale";
import { SectionLabel } from "@/components/ui/section-label";
import { DayNumber } from "@/features/home/day-number";
import { Envelopes } from "@/features/home/envelopes";
import { amountParts } from "@/features/home/today-spend";
import { SAMPLE_HOUSEHOLD_HOME } from "./sample";

export function ReadOnlyHome() {
	const home = SAMPLE_HOUSEHOLD_HOME;
	const { whole, decimals } = amountParts(home.dailyCents);
	const daysLeft = formatDaysLeft(home.daysLeft);

	return (
		<View>
			<PressableScale
				scale={0.985}
				accessibilityRole="button"
				onPress={() => router.push({ pathname: "/plan", params: { status: "lapsed" } })}
				className="min-h-11 justify-center rounded-2xl border border-warning px-4 py-2.5"
			>
				<Text className="text-[13px] font-semibold text-warning-foreground">
					Solo lectura · Activa Plus para seguir anotando
				</Text>
			</PressableScale>

			<View className="mt-[22px]">
				<SectionLabel>Pueden gastar hoy juntos</SectionLabel>
			</View>
			<View className="mt-2">
				<DayNumber whole={whole} decimals={decimals} />
			</View>
			<Text className="mt-2.5 text-[13px] text-muted-foreground">
				{`${daysLeft.charAt(0).toUpperCase()}${daysLeft.slice(1)} · ciclo ${formatRange(home.startDate, home.endDate)}.`}
			</Text>

			<View className="mt-[22px]">
				<Envelopes home={home} />
			</View>
		</View>
	);
}
