import { Text, View } from "react-native";
import { MoneyField } from "./money-field";

export function StepToday({
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
