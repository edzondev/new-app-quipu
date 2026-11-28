import {
	annualSavings,
	type Interval,
	monthlyEquivalent,
	planPrices,
} from "@quipu/backend/shared/billing";
import { formatCents } from "@quipu/backend/shared/budget";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { FeatureTable } from "./feature-table";
import { FEATURE_OFFERS, type PlusFeature, usePlus } from "./plus";

function OfferView({
	feature,
	trialAvailable,
	onTrial,
	onPlans,
	onClose,
}: {
	feature: PlusFeature;
	trialAvailable: boolean;
	onTrial: () => void;
	onPlans: () => void;
	onClose: () => void;
}) {
	const offer = FEATURE_OFFERS[feature];

	return (
		<View>
			<View className="self-start rounded-full bg-primary/10 px-2.5 py-1">
				<Text className="text-xs font-semibold text-primary">Plus</Text>
			</View>
			<Text className="mt-3 text-3xl font-semibold text-foreground">{offer.title}</Text>
			<Text className="mt-2 text-sm text-muted-foreground">{offer.subtitle}</Text>
			<View className="mt-5 gap-3.5">
				{offer.points.map((point) => (
					<View key={point.title}>
						<Text className="text-[14.5px] font-semibold text-foreground">{point.title}</Text>
						<Text className="mt-0.5 text-[13px] text-muted-foreground">{point.detail}</Text>
					</View>
				))}
			</View>
			<View className="mt-6 gap-2">
				{trialAvailable ? (
					<>
						<Button label="Probar 14 días gratis" onPress={onTrial} />
						<Button label="Ver planes" variant="secondary" onPress={onPlans} />
					</>
				) : (
					<>
						<Button label="Suscribirme" onPress={onPlans} />
						<Button label="Ahora no" variant="secondary" onPress={onClose} />
					</>
				)}
			</View>
			{trialAvailable ? (
				<Text className="mt-3 text-center text-xs text-muted-foreground">
					Sin tarjeta. Al terminar vuelves a Gratis.
				</Text>
			) : null}
		</View>
	);
}

const LABEL: Record<Interval, string> = { year: "Anual", month: "Mensual" };
const PER: Record<Interval, string> = { year: "al año", month: "al mes" };
const CHARGE: Record<Interval, string> = {
	year: "Cobro anual. Renovación automática.",
	month: "Cobro mensual. Renovación automática.",
};

function PlanOption({
	interval,
	cents,
	savedCents,
	selected,
	onPress,
}: {
	interval: Interval;
	cents: number | null;
	savedCents: number | null;
	selected: boolean;
	onPress: () => void;
}) {
	return (
		<PressableScale
			scale={0.985}
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			onPress={() => {
				if (selected) return;
				void Haptics.selectionAsync();
				onPress();
			}}
			className={`min-h-16 flex-row items-center justify-between gap-3 rounded-2xl px-4 py-3 ${selected ? "border-2 border-foreground" : "border border-input"}`}
		>
			<View className="min-w-0 flex-1">
				<View className="flex-row flex-wrap items-center gap-2">
					<Text className="text-[15px] font-semibold text-foreground">{LABEL[interval]}</Text>
					{savedCents === null ? null : (
						<Text className="text-xs font-semibold text-envelope-savings">
							Ahorras S/ {formatCents(savedCents)}
						</Text>
					)}
				</View>
				{interval === "year" && cents !== null ? (
					<Text className="text-xs text-muted-foreground">
						Equivale a S/ {formatCents(monthlyEquivalent(cents))} al mes.
					</Text>
				) : null}
			</View>
			<Text className="shrink-0 font-mono text-[15px] text-foreground">
				{cents === null ? "Precio por confirmar" : `S/ ${formatCents(cents)} ${PER[interval]}`}
			</Text>
		</PressableScale>
	);
}

function PlansView({ highlight, onContinue }: { highlight?: PlusFeature; onContinue: () => void }) {
	const { offers } = usePlus();
	const [interval, setInterval] = useState<Interval>("year");
	const prices = planPrices(offers);
	const saved = annualSavings(prices);
	const price = prices[interval];

	return (
		<View>
			<Text className="text-3xl font-semibold text-foreground">Quipu Plus</Text>
			<Text className="mt-1 text-sm text-muted-foreground">Elige cómo pagar.</Text>

			<View className="mt-4 gap-2.5" accessibilityRole="radiogroup">
				<PlanOption
					interval="year"
					cents={prices.year}
					savedCents={saved}
					selected={interval === "year"}
					onPress={() => setInterval("year")}
				/>
				<PlanOption
					interval="month"
					cents={prices.month}
					savedCents={null}
					selected={interval === "month"}
					onPress={() => setInterval("month")}
				/>
			</View>

			<View className="mt-4">
				<Button label="Continuar" disabled={price === null} onPress={onContinue} />
			</View>
			<Text className="mt-2 text-center text-xs text-muted-foreground">
				{price === null ? "El pago aún no está disponible." : CHARGE[interval]}
			</Text>
			<Text className="mt-1 text-center text-xs text-muted-foreground">
				Pago seguro · Cancela cuando quieras.
			</Text>

			<Text className="mt-5 text-[15px] font-semibold text-foreground">Lo que suma Plus</Text>
			<Text className="mt-0.5 mb-3 text-xs text-muted-foreground">
				Todo lo de Gratis, más estas funciones.
			</Text>
			<FeatureTable heading="Incluye" highlight={highlight} />
			<Text className="mt-3 text-xs text-muted-foreground">El resto de Quipu sigue gratis.</Text>
		</View>
	);
}

// The sheet unmounts its content when it closes, so each opening starts from the first view.
// Another sheet can show it in place of its own content (the goal form), so two sheets never stack.
export function PlusContent({
	feature,
	onClose,
	onTrial,
}: {
	feature: PlusFeature | null;
	onClose: () => void;
	onTrial?: (endsAt: number) => void;
}) {
	const { trialAvailable, startTrial } = usePlus();
	const [plans, setPlans] = useState(feature === null);

	if (plans || feature === null) {
		return <PlansView highlight={feature ?? undefined} onContinue={onClose} />;
	}
	return (
		<OfferView
			feature={feature}
			trialAvailable={trialAvailable}
			onTrial={() => {
				const endsAt = startTrial();
				onClose();
				onTrial?.(endsAt);
			}}
			onPlans={() => setPlans(true)}
			onClose={onClose}
		/>
	);
}

export function PlusSheet({
	isPresented,
	onDismiss,
	feature = null,
	onTrial,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	feature?: PlusFeature | null;
	onTrial?: (endsAt: number) => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<PlusContent feature={feature} onClose={onDismiss} onTrial={onTrial} />
		</BottomSheet>
	);
}
