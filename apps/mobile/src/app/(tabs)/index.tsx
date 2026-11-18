import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { useOpenCycle } from "@/features/cycle/use-open-cycle";
import { ReadOnlyHome } from "@/features/household/readonly-home";
import { useSpace } from "@/features/household/space-context";
import { EmptyPersonal } from "@/features/home/empty-states";
import { HomeHeader } from "@/features/home/home-header";
import { PersonalHome } from "@/features/home/personal-home";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { WelcomeModal } from "@/features/onboarding/welcome-modal";
import { PlusSheet } from "@/features/plus/plus-sheet";

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const today = useLimaDate();
	const profile = useQuery(api.profiles.myProfile);
	const markWelcomeSeen = useMutation(api.profiles.markWelcomeSeen);
	const [plansOpen, setPlansOpen] = useState(false);
	const hasPersonalPlan = space === "personal" && !!profile?.plan;
	const opened = useOpenCycle(today, hasPersonalPlan);
	const args = opened ? ({ space: "personal", today } as const) : "skip";
	const home = useQuery(api.balances.getHome, args);
	const commitments = useQuery(api.commitments.list, args);
	const closeWelcome = () => void markWelcomeSeen();

	if (!profile) return null;

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
				<HomeHeader name={profile.name} hasHousehold={profile.hasHousehold} />

				{space === "household" ? (
					<View className="mt-6">
						<ReadOnlyHome />
					</View>
				) : !profile.plan ? (
					<EmptyPersonal />
				) : home && commitments ? (
					<PersonalHome home={home} items={commitments.items} today={today} />
				) : null}

				{/* TEMPORAL: enlace de prueba; se quita al conectar el informe del ciclo. */}
				<Pressable
					accessibilityRole="link"
					className="mt-6 min-h-11 justify-center"
					onPress={() => router.push("/report")}
				>
					<Text className="text-[13px] text-muted-foreground underline">
						Probar: Informe del ciclo
					</Text>
				</Pressable>
			</ScrollView>

			<WelcomeModal
				visible={!profile.welcomeSeen}
				name={profile.name}
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
