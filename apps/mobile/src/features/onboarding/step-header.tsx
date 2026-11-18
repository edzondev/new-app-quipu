import { Pressable, Text, View } from "react-native";

const STEPS = [1, 2, 3, 4] as const;

export function StepHeader({ step, onBack }: { step: 1 | 2 | 3 | 4; onBack: () => void }) {
	return (
		<View className="px-6 pt-3">
			<View
				className="flex-row gap-2"
				accessibilityRole="progressbar"
				accessibilityLabel={`Paso ${step} de 4`}
			>
				{STEPS.map((index) => (
					<View
						key={index}
						className={`h-[3px] flex-1 rounded-full ${index <= step ? "bg-foreground" : "bg-input"}`}
					/>
				))}
			</View>
			<View className="min-h-11 flex-row items-center justify-between">
				<Text className="text-[13px] text-muted-foreground">{step} de 4</Text>
				{step > 1 ? (
					<Pressable
						accessibilityRole="button"
						onPress={onBack}
						className="min-h-11 justify-center px-2"
					>
						<Text className="text-[13px] font-semibold text-foreground">Volver</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
}
