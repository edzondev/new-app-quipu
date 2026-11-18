import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DayList } from "@/features/cycle/day-list";
import { StepCycle } from "./step-cycle";
import { StepHeader } from "./step-header";
import { StepName } from "./step-name";
import { StepSplit } from "./step-split";
import { StepToday } from "./step-today";
import { useOnboarding } from "./use-onboarding";

export function OnboardingScreen() {
	const insets = useSafeAreaInsets();
	const profile = useQuery(api.profiles.myProfile);

	// The form waits for the profile: with a plan, Primeros pasos is closed and the form must not flash.
	if (profile === undefined) {
		return (
			<View className="flex-1 gap-3 bg-background px-6" style={{ paddingTop: insets.top + 12 }}>
				<Skeleton className="h-10 w-56" />
				<Skeleton className="h-14" />
				<Skeleton className="h-14" />
			</View>
		);
	}
	// Primeros pasos can't be reopened once there is a personal plan.
	if (profile?.plan) return <Redirect href="/" />;

	// The form starts its name from the profile, so it mounts only once the profile is here.
	return <OnboardingForm name={profile?.name ?? ""} />;
}

function OnboardingForm({ name }: { name: string }) {
	const insets = useSafeAreaInsets();
	const flow = useOnboarding(name);
	const [dayOpen, setDayOpen] = useState(false);
	const last = flow.step === 4;
	const waitsForFrequency = flow.step === 2 && flow.plan === null;

	return (
		<KeyboardAvoidingView
			className="flex-1 bg-background"
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View style={{ paddingTop: insets.top }}>
				<StepHeader step={flow.step} onBack={flow.back} />
			</View>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pt-2 pb-6"
				keyboardShouldPersistTaps="handled"
			>
				{flow.step === 1 ? (
					<StepName name={flow.name} nameError={flow.nameError} onName={flow.setName} />
				) : flow.step === 2 ? (
					<StepCycle
						frequency={flow.frequency}
						onFrequency={flow.setFrequency}
						plan={flow.plan}
						onOpenDay={() => setDayOpen(true)}
						incomeText={flow.incomeText}
						incomeError={flow.incomeError}
						onIncome={flow.setIncomeText}
					/>
				) : flow.step === 3 ? (
					<StepToday
						todayText={flow.todayText}
						todayError={flow.todayError}
						onToday={flow.setTodayText}
					/>
				) : (
					<StepSplit
						split={flow.split}
						amounts={flow.envelopes}
						onChange={flow.setSplit}
						error={flow.splitError ?? flow.saveError}
					/>
				)}
			</ScrollView>
			<View className="px-6 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
				<Button
					label={last ? (flow.saving ? "Guardando…" : "Empezar mi ciclo") : "Continuar"}
					disabled={waitsForFrequency || (last && flow.saving)}
					accessibilityHint={waitsForFrequency ? "Elige cada cuánto te pagan" : undefined}
					onPress={last ? () => void flow.finish() : flow.next}
				/>
			</View>

			<BottomSheet isPresented={dayOpen} onDismiss={() => setDayOpen(false)}>
				{flow.plan ? (
					<DayList
						cadence={flow.plan.cadence}
						value={flow.plan.cycleStartDay}
						onPick={(day) => {
							flow.setStartDay(String(day));
							setDayOpen(false);
						}}
					/>
				) : null}
			</BottomSheet>
		</KeyboardAvoidingView>
	);
}
