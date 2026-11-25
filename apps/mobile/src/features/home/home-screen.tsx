import { api } from "@quipu/backend/convex/_generated/api";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { queryOptions, useMutation, useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadBoundary } from "@/components/ui/load-boundary";
import { useLimaDate } from "@/features/cycle/use-lima-date";
import { useEnsureOpen } from "@/features/cycle/use-ensure-open";
import { EmptyPersonal } from "@/features/home/empty-states";
import { HomeHeader } from "@/features/home/home-header";
import { HomeLoading, HomeSkeleton } from "@/features/home/home-skeleton";
import { PersonalHome } from "@/features/home/personal-home";
import { ReadOnlyHome } from "@/features/household/readonly-home";
import { useSpace } from "@/features/household/space-context";
import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { WelcomeModal } from "@/features/onboarding/welcome-modal";
import { PlusSheet } from "@/features/plus/plus-sheet";
import { enter } from "@/lib/motion";

/** Inicio's personal content. Its data lives here, so a failure remounts only this part. */
function PersonalBody({ today }: { today: string }) {
	useEnsureOpen("personal", today);
	const [{ data: home }, { data: commitments }] = useSuspenseQueries({
		queries: [
			queryOptions(convexQuery(api.balances.getHome, { space: "personal", today })),
			queryOptions(convexQuery(api.commitments.list, { space: "personal", today })),
		],
	});

	// The skeleton leaves at once: fading it out would keep both in the layout for a moment.
	return (
		<Animated.View entering={enter}>
			<PersonalHome home={home} items={commitments.items} today={today} />
		</Animated.View>
	);
}

export function HomeScreen() {
	const insets = useSafeAreaInsets();
	const { space } = useSpace();
	const today = useLimaDate();
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));
	const markWelcomeSeen = useMutation({
		mutationFn: useConvexMutation(api.profiles.markWelcomeSeen),
	});
	const [plansOpen, setPlansOpen] = useState(false);
	const closeWelcome = () => markWelcomeSeen.mutate({});

	if (!profile) return <HomeLoading />;

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
				) : (
					<LoadBoundary message="No pudimos cargar tu inicio." fallback={<HomeSkeleton />}>
						<PersonalBody today={today} />
					</LoadBoundary>
				)}

				{/* TEMPORAL: enlace de prueba; se quita al conectar el informe del ciclo. */}
				<Pressable
					accessibilityRole="link"
					className="mt-6 min-h-11 justify-center active:opacity-60"
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
