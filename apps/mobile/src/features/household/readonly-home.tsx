import { formatDaysLeft, formatRange } from "@quipu/backend/shared/dates";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { DayNumber } from "@/features/home/day-number";
import { Envelopes } from "@/features/home/envelopes";
import { amountParts } from "@/features/home/hero";
import { SAMPLE_HOUSEHOLD_HOME } from "./sample";

/** K4a: the two see the number and the envelopes, nothing can be written until someone has Plus. */
export function ReadOnlyHome() {
	const home = SAMPLE_HOUSEHOLD_HOME;
	const { whole, decimals } = amountParts(home.dailyCents);
	const daysLeft = formatDaysLeft(home.daysLeft);

	return (
		<View>
			<Pressable
				accessibilityRole="button"
				onPress={() => router.push({ pathname: "/plan", params: { status: "lapsed" } })}
				className="min-h-11 justify-center rounded-2xl border border-warning px-4 py-2.5"
			>
				<Text className="text-[13px] font-semibold text-warning-foreground">
					Solo lectura · Activa Plus para seguir anotando
				</Text>
			</Pressable>

			<Text className="mt-6 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				Pueden gastar hoy juntos
			</Text>
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
