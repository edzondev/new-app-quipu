import { planCard } from "@quipu/backend/shared/billing";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { SectionLabel } from "@/components/ui/section-label";
import { SAMPLE_TODAY } from "@/features/home/sample";
import { FeatureTable } from "@/features/plus/feature-table";
import { PlusSheet } from "@/features/plus/plus-sheet";
import { sampleStatus } from "@/features/plus/sample";
import { SUBSCRIPTIONS_URL } from "@/features/settings/links";

export default function PlanScreen() {
	const insets = useSafeAreaInsets();
	const { status: key } = useLocalSearchParams<{ status?: string }>();
	const [plansOpen, setPlansOpen] = useState(false);
	const card = planCard(sampleStatus(key), SAMPLE_TODAY);

	return (
		<View className="flex-1 bg-background">
			<ScrollView
				contentContainerClassName="px-6"
				contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 24 }}
			>
				<ScreenHeader title="Ajustes" />
				<View className="mt-4">
					<SectionLabel>Suscripción</SectionLabel>
				</View>
				<Text className="mt-1 text-3xl font-semibold text-foreground">Tu plan</Text>

				<View className="mt-5 rounded-[22px] bg-muted px-5 py-4">
					<Text className="text-xs text-muted-foreground">Tu plan actual</Text>
					<Text className="mt-1 text-2xl font-semibold text-foreground">{card.title}</Text>
					{card.line ? (
						<Text className="mt-1 text-sm text-muted-foreground">{card.line}</Text>
					) : null}
					{card.action ? (
						<View className="mt-4">
							<Button
								label={card.action.label}
								onPress={() =>
									card.action?.to === "plans"
										? setPlansOpen(true)
										: void Linking.openURL(SUBSCRIPTIONS_URL)
								}
							/>
						</View>
					) : null}
				</View>

				<Text className="mt-7 mb-3 text-[15px] font-semibold text-foreground">
					Gratis y Quipu Plus
				</Text>
				<FeatureTable heading="Funciones" />
				<Text className="mt-3 text-xs text-muted-foreground">El resto de Quipu sigue gratis.</Text>
			</ScrollView>
			<PlusSheet isPresented={plansOpen} onDismiss={() => setPlansOpen(false)} />
		</View>
	);
}
