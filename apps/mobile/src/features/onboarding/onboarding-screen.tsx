import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { DayGrid } from "@/features/cycle/day-grid";
import { FixedSheet } from "./fixed-sheet";
import { rangeText } from "./onboarding-plan";
import { StepHeader } from "./step-header";
import { StepNumber } from "./step-number";
import { StepSplit } from "./step-split";
import { StepToday } from "./step-today";
import { useOnboarding } from "./use-onboarding";

export function OnboardingScreen() {
	const insets = useSafeAreaInsets();
	const toast = useToast();
	const profile = useQuery(api.profiles.myProfile);
	const flow = useOnboarding((text) => toast.show(text, true), profile?.name ?? "");
	const [sheet, setSheet] = useState<"day" | "fixed" | null>(null);
	const rangeLabel = rangeText(flow.range);
	const last = flow.step === 3;

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
					<StepToday
						name={flow.name}
						nameError={flow.nameError}
						onName={flow.setName}
						todayText={flow.todayText}
						todayMissing={flow.todayMissing}
						onToday={flow.setTodayText}
						cadence={flow.cadence}
						onCadence={flow.setCadence}
						startDay={flow.startDay}
						rangeLabel={rangeLabel}
						onOpenDay={() => setSheet("day")}
						incomeText={flow.incomeText}
						onIncome={flow.setIncomeText}
					/>
				) : flow.step === 2 ? (
					<StepSplit split={flow.split} amounts={flow.number.envelopes} onChange={flow.setSplit} />
				) : (
					<StepNumber
						cadence={flow.cadence}
						todayCents={flow.todayCents}
						rangeLabel={rangeLabel}
						endDate={flow.range.endDate}
						number={flow.number}
						onOpenFixed={() => setSheet("fixed")}
					/>
				)}
			</ScrollView>
			<View className="px-6 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
				<Button
					label={last ? "Empezar mi ciclo" : "Continuar"}
					disabled={last && (flow.number.overIncome || flow.saving)}
					onPress={last ? () => void flow.finish() : flow.next}
				/>
			</View>

			<BottomSheet isPresented={sheet === "day"} onDismiss={() => setSheet(null)}>
				<DayGrid
					cadence={flow.cadence}
					value={flow.startDay}
					onPick={(day) => {
						flow.setStartDay(day);
						setSheet(null);
					}}
				/>
			</BottomSheet>
			<FixedSheet
				isPresented={sheet === "fixed"}
				onDismiss={() => setSheet(null)}
				items={flow.items}
				dailyCents={flow.number.dailyCents}
				onAdd={flow.addItem}
				onChange={flow.updateItem}
				onRemove={flow.removeItem}
			/>
			{toast.view}
		</KeyboardAvoidingView>
	);
}
