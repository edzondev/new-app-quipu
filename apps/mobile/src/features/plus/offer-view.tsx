import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { FEATURE_OFFERS, type PlusFeature } from "./features";

export function OfferView({
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
