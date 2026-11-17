import {
	annualSavings,
	type Interval,
	monthlyEquivalent,
	planPrices,
} from "@quipu/backend/shared/billing";
import { formatCents } from "@quipu/backend/shared/budget";
import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { Button } from "@/components/ui/button";
import { FeatureTable } from "./feature-table";
import type { PlusFeature } from "./features";
import { usePlus } from "./use-plus";

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
		<Pressable
			accessibilityRole="radio"
			accessibilityState={{ selected }}
			onPress={onPress}
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
		</Pressable>
	);
}

export function PlansView({
	highlight,
	onContinue,
}: {
	highlight?: PlusFeature;
	onContinue: () => void;
}) {
	const { offers } = usePlus();
	const { height } = useWindowDimensions();
	const [interval, setInterval] = useState<Interval>("year");
	const prices = planPrices(offers);
	const saved = annualSavings(prices);
	const price = prices[interval];

	return (
		<ScrollView style={{ maxHeight: height * 0.8 }} showsVerticalScrollIndicator={false}>
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
				{/* Luego: pago de Google Play al conectar la tienda. */}
				<Button label="Continuar" disabled={price === null} onPress={onContinue} />
			</View>
			<Text className="mt-2 text-center text-xs text-muted-foreground">
				{price === null ? "El pago aún no está disponible." : CHARGE[interval]}
			</Text>
			<Text className="mt-1 text-center text-xs text-muted-foreground">
				Pago seguro · Cancela cuando quieras.
			</Text>

			<Text className="mt-6 text-[15px] font-semibold text-foreground">Lo que suma Plus</Text>
			<Text className="mt-0.5 mb-3 text-xs text-muted-foreground">
				Todo lo de Gratis, más estas funciones.
			</Text>
			<FeatureTable heading="Incluye" highlight={highlight} />
			<Text className="mt-3 text-xs text-muted-foreground">El resto de Quipu sigue gratis.</Text>
		</ScrollView>
	);
}
