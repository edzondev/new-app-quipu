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
			<Text className="mt-6 mb-2 text-sm text-muted-foreground">Efectivo y cuentas, juntos</Text>
			<MoneyField
				value={todayText}
				onChange={onToday}
				label="¿Cuánto tienes hoy?"
				large
				invalid={todayError !== null}
			/>
			{todayError ? (
				<Text accessibilityRole="alert" className="mt-2 text-[13px] text-warning-foreground">
					{todayError}
				</Text>
			) : null}
		</View>
	);
}
