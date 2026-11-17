import { formatDaysLeft } from "@quipu/backend/shared/dates";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReadOnlyHome } from "@/features/household/readonly-home";
import { useSpace } from "@/features/household/space-context";
import { DayNumber } from "@/features/home/day-number";
import { DueSoon } from "@/features/home/due-soon";
import { Envelopes } from "@/features/home/envelopes";
import { HomeHeader } from "@/features/home/home-header";
import { homeHero } from "@/features/home/hero";
import { SAMPLE_COMMITMENTS, SAMPLE_HOME, SAMPLE_TODAY } from "@/features/home/sample";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { WelcomeModal } from "@/features/onboarding/welcome-modal";
import { PlusSheet } from "@/features/plus/plus-sheet";
import { SAMPLE_PROFILE } from "@/features/settings/sample";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const { welcome } = useLocalSearchParams<{ welcome?: string }>();
	const [plansOpen, setPlansOpen] = useState(false);
	const hero = homeHero(SAMPLE_HOME);
	const daysLeft = formatDaysLeft(SAMPLE_HOME.daysLeft);
	const daysLeftLabel = `${daysLeft.charAt(0).toUpperCase()}${daysLeft.slice(1)}`;
	const closeWelcome = () => router.setParams({ welcome: undefined });

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6"
				contentContainerStyle={{
					paddingTop: insets.top + 12,
					paddingBottom: insets.bottom + TAB_BAR_SPACE,
				}}
			>
				<HomeHeader name={SAMPLE_PROFILE.name} hasHousehold={SAMPLE_PROFILE.hasHousehold} />

				{space === "household" ? (
					<View className="mt-6">
						<ReadOnlyHome />
					</View>
				) : (
					<>
						<Text className="mt-6 text-[13px] font-semibold tracking-wide text-muted-foreground uppercase">
							{hero.label}
						</Text>
						<View className="mt-2">
							<DayNumber whole={hero.whole} decimals={hero.decimals} over={hero.over} />
						</View>
						<Text className="mt-2.5 text-[13px] text-muted-foreground">{daysLeftLabel}</Text>

						<View className="mt-[22px]">
							<Envelopes home={SAMPLE_HOME} />
						</View>

						<DueSoon items={SAMPLE_COMMITMENTS.items} today={SAMPLE_TODAY} />
					</>
				)}

				{/* TEMPORAL: enlaces de prueba; se quitan al conectar la sesión real. */}
				<Pressable
					accessibilityRole="link"
					className="mt-6 min-h-11 justify-center"
					onPress={() => router.push("/sign-in")}
				>
					<Text className="text-[13px] text-muted-foreground underline">Probar: Entrar</Text>
				</Pressable>
				<Pressable
					accessibilityRole="link"
					className="min-h-11 justify-center"
					onPress={() => router.push("/report")}
				>
					<Text className="text-[13px] text-muted-foreground underline">
						Probar: Informe del ciclo
					</Text>
				</Pressable>
			</ScrollView>

			<WelcomeModal
				visible={welcome === "1"}
				name={SAMPLE_PROFILE.name}
				onClose={closeWelcome}
				onSeePlus={() => {
					closeWelcome();
					setPlansOpen(true);
				}}
			/>
			<PlusSheet isPresented={plansOpen} onDismiss={() => setPlansOpen(false)} />
		</View>
	);
}
