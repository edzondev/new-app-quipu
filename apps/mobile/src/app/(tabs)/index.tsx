import { DueSoon } from "@/features/home/due-soon";
import { Envelopes } from "@/features/home/envelopes";
import { homeHero } from "@/features/home/hero";
import { SAMPLE_COMMITMENTS, SAMPLE_HOME, SAMPLE_TODAY } from "@/features/home/sample";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const hero = homeHero(SAMPLE_HOME);
	const daysLeft =
		SAMPLE_HOME.daysLeft === 1 ? "Queda 1 día" : `Quedan ${SAMPLE_HOME.daysLeft} días`;

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="px-6"
			contentContainerStyle={{
				paddingTop: insets.top + 22,
				paddingBottom: insets.bottom + 24,
			}}
		>
			<Text className="text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
				{hero.label}
			</Text>
			<View className="mt-2 flex-row items-start">
				<Text className="mt-2.5 mr-1 text-2xl text-muted-foreground">S/</Text>
				<Text
					className={`font-mono text-[80px] leading-none tracking-tight ${hero.over ? "text-warning-foreground" : "text-foreground"}`}
				>
					{hero.whole}
					<Text className="text-[36px] text-muted-foreground">.{hero.decimals}</Text>
				</Text>
			</View>
			<Text className="mt-2.5 text-[13px] text-muted-foreground">{daysLeft}</Text>

			<View className="mt-[22px]">
				<Envelopes home={SAMPLE_HOME} />
			</View>

			<DueSoon items={SAMPLE_COMMITMENTS.items} today={SAMPLE_TODAY} />
		</ScrollView>
	);
}
