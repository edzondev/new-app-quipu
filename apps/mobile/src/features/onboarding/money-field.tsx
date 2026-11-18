import { Text, TextInput, View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

/** `large` is the amount of "¿Cuánto tienes hoy?" (S/ 22, number 44, ink line); the rest is the usual income. */
export function MoneyField({
	value,
	onChange,
	label,
	large = false,
	invalid = false,
}: {
	value: string;
	onChange: (text: string) => void;
	label: string;
	large?: boolean;
	invalid?: boolean;
}) {
	const muted = useThemeColor("--color-muted-foreground");
	const line = invalid
		? "border-b-2 border-warning"
		: large
			? "border-b-[1.5px] border-foreground"
			: "border-b border-input";

	return (
		<View
			className={`flex-row items-baseline ${large ? "gap-2.5 pt-2 pb-2.5" : "gap-2 py-2"} ${line}`}
		>
			<Text className={`font-mono text-muted-foreground ${large ? "text-[22px]" : "text-lg"}`}>
				S/
			</Text>
			<TextInput
				className={`min-w-0 flex-1 p-0 font-mono text-foreground ${large ? "text-[44px]" : "text-[28px]"}`}
				keyboardType="decimal-pad"
				value={value}
				onChangeText={(text) => onChange(text.replace(/[^\d.,]/g, ""))}
				placeholder="0.00"
				placeholderTextColor={muted}
				accessibilityLabel={label}
			/>
		</View>
	);
}
