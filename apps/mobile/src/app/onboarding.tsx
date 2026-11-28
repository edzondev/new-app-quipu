import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import {
	AMOUNT_KEYS,
	ENVELOPE_LABELS,
	type EnvelopeAmounts,
	wholeSoles,
} from "@quipu/backend/shared/budget";
import { NAME_MAX } from "@quipu/backend/shared/name";
import type { Split } from "@quipu/backend/shared/plan";
import {
	describePayday,
	FREQUENCIES,
	type Frequency,
	FREQUENCY_LABELS,
	type getCyclePlan,
	getStartDayLabel,
	getStartDayTitle,
} from "@quipu/backend/shared/start-day";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { BackHandler, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import Check from "reicon-react-native/icons/Check";
import Minus from "reicon-react-native/icons/Minus";
import Plus from "reicon-react-native/icons/Plus";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { KeyboardAvoidingView } from "@/components/ui/keyboard-avoiding-view";
import { PressableScale } from "@/components/ui/pressable-scale";
import { Skeleton } from "@/components/ui/skeleton";
import { DayList } from "@/features/cycle/day-list";
import { DayRow } from "@/features/cycle/day-row";
import { MoneyField } from "@/features/onboarding/money-field";
import { SPLIT_STEP, stepSplit, useOnboarding } from "@/features/onboarding/use-onboarding";
import { ENVELOPE_DOT } from "@/lib/envelope-dot";
import { enter } from "@/lib/motion";
import { useThemeColor } from "@/lib/use-theme-color";

const STEPS = [1, 2, 3, 4] as const;

function StepHeader({ step, onBack }: { step: 1 | 2 | 3 | 4; onBack: () => void }) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View className="px-6 pt-3.5">
			<View
				className="flex-row gap-1.5"
				accessibilityRole="progressbar"
				accessibilityLabel={`Paso ${step} de 4`}
			>
				{STEPS.map((index) => (
					<View
						key={index}
						className={`h-1 flex-1 rounded-full ${index <= step ? "bg-foreground" : "bg-border"}`}
					/>
				))}
			</View>
			<View className="mt-1 min-h-11 flex-row items-center justify-between">
				{step > 1 ? (
					<Pressable
						accessibilityRole="button"
						onPress={onBack}
						className="min-h-11 flex-row items-center gap-1 active:opacity-60"
					>
						<AngleLeft size={16} color={muted} />
						<Text className="text-xs text-muted-foreground">Volver</Text>
					</Pressable>
				) : null}
				<Text className="text-xs text-muted-foreground">{step} de 4</Text>
			</View>
		</View>
	);
}

function StepName({
	name,
	nameError,
	onName,
}: {
	name: string;
	nameError: string | null;
	onName: (text: string) => void;
}) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View>
			<Text className="text-4xl leading-[40px] font-semibold text-foreground">
				¿Cómo te llamas?
			</Text>
			<Text className="mt-7 text-[13.5px] font-medium text-muted-foreground">Tu nombre</Text>
			<TextInput
				className={`mt-1 border-b-[1.5px] px-0 pt-2 pb-2.5 text-[28px] font-medium text-foreground ${nameError ? "border-warning" : "border-foreground"}`}
				placeholder="Tu nombre"
				placeholderTextColor={muted}
				autoCapitalize="words"
				autoComplete="given-name"
				textContentType="givenName"
				maxLength={NAME_MAX}
				value={name}
				onChangeText={onName}
				accessibilityLabel="Tu nombre"
			/>
			{nameError ? (
				<Text accessibilityRole="alert" className="mt-1.5 text-[13px] text-warning-foreground">
					{nameError}
				</Text>
			) : null}
		</View>
	);
}

function StepToday({
	todayText,
	todayError,
	onToday,
}: {
	todayText: string;
	todayError: string | null;
	onToday: (text: string) => void;
}) {
	return (
		<View>
			<Text className="text-[32px] leading-[35px] font-semibold text-foreground">
				¿Cuánto tienes hoy?
			</Text>
			<Text className="mt-7 text-[13.5px] font-medium text-muted-foreground">
				Efectivo y cuentas, juntos
			</Text>
			<View className="mt-0.5">
				<MoneyField
					value={todayText}
					onChange={onToday}
					label="¿Cuánto tienes hoy?"
					large
					invalid={todayError !== null}
				/>
			</View>
			{todayError ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					{todayError}
				</Text>
			) : null}
		</View>
	);
}

function StepCycle({
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

const ORDER = ["needs", "wants", "savings"] as const;

function StepButton({
	label,
	onPress,
	children,
}: {
	label: string;
	onPress: () => void;
	children: ReactNode;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			className="size-11 items-center justify-center rounded-full bg-muted active:opacity-60"
		>
			{children}
		</Pressable>
	);
}

function StepSplit({
	split,
	amounts,
	onChange,
	error,
}: {
	split: Split;
	amounts: EnvelopeAmounts;
	onChange: (split: Split) => void;
	error: string | null;
}) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<View>
			<Text className="mb-1 text-4xl leading-[40px] font-semibold text-foreground">
				Así se reparte
			</Text>
			{ORDER.map((envelope) => (
				<View key={envelope} className="border-b border-border py-4">
					<View className="flex-row items-center justify-between">
						<View className="flex-row items-center gap-2.5">
							<View className={`size-2 shrink-0 rounded-full ${ENVELOPE_DOT[envelope]}`} />
							<Text className="text-[15px] font-semibold text-foreground">
								{ENVELOPE_LABELS[envelope]}
							</Text>
						</View>
						<View className="flex-row items-center gap-1.5">
							<StepButton
								label={`Bajar ${ENVELOPE_LABELS[envelope]}`}
								onPress={() => onChange(stepSplit(split, envelope, -SPLIT_STEP))}
							>
								<Minus size={16} color={foreground} />
							</StepButton>
							<Text className="w-[52px] text-center font-mono text-[17px] text-foreground">
								{split[envelope]}%
							</Text>
							<StepButton
								label={`Subir ${ENVELOPE_LABELS[envelope]}`}
								onPress={() => onChange(stepSplit(split, envelope, SPLIT_STEP))}
							>
								<Plus size={16} color={foreground} />
							</StepButton>
						</View>
					</View>
					<View className="mt-2.5 flex-row items-center gap-3">
						<View className="h-[5px] flex-1 overflow-hidden rounded-full bg-muted">
							<View
								className={`h-full rounded-full ${ENVELOPE_DOT[envelope]}`}
								style={{ width: `${split[envelope]}%` }}
							/>
						</View>
						<Text className="w-[84px] text-right font-mono text-[13px] text-foreground">
							S/ {wholeSoles(amounts[AMOUNT_KEYS[envelope]])}
						</Text>
					</View>
				</View>
			))}
			<Text className="mt-3 text-[13px] text-muted-foreground">
				Puedes cambiarlo cuando quieras en tus sobres.
			</Text>
			{error ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					{error}
				</Text>
			) : null}
		</View>
	);
}

export default function OnboardingScreen() {
	const insets = useSafeAreaInsets();
	const { data: profile } = useQuery(convexQuery(api.profiles.myProfile, {}));

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
	const { step, back } = flow;

	// Android back goes to the step before; on the first step it keeps its default.
	useEffect(() => {
		if (step === 1) return;
		const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
			back();
			return true;
		});
		return () => subscription.remove();
	}, [step, back]);

	return (
		<KeyboardAvoidingView className="flex-1 bg-background" behavior="padding">
			<View style={{ paddingTop: insets.top }}>
				<StepHeader step={flow.step} onBack={flow.back} />
			</View>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-6 pt-4 pb-6"
				keyboardShouldPersistTaps="handled"
			>
				{/* The first step arrives with the screen; only moving between steps animates. */}
				<LayoutAnimationConfig skipEntering>
					<Animated.View key={flow.step} entering={enter}>
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
					</Animated.View>
				</LayoutAnimationConfig>
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
