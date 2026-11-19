import { Pressable, Text, View } from "react-native";
import AngleLeft from "reicon-react-native/icons/AngleLeft";
import { useThemeColor } from "@/lib/use-theme-color";

const STEPS = [1, 2, 3, 4] as const;

export function StepHeader({ step, onBack }: { step: 1 | 2 | 3 | 4; onBack: () => void }) {
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
				<Text className="text-xs text-muted-foreground">{step} de 4</Text>
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
			</View>
		</View>
	);
}
