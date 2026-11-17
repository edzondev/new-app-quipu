import { Text, TextInput, View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

export function MoneyField({
	value,
	onChange,
	label,
	large = false,
}: {
	value: string;
	onChange: (text: string) => void;
	label: string;
	large?: boolean;
}) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<View className="flex-row items-baseline gap-2 border-b border-input">
			<Text className={`text-muted-foreground ${large ? "text-2xl" : "text-lg"}`}>S/</Text>
			<TextInput
				className={`min-w-0 flex-1 py-1 font-mono text-foreground ${large ? "text-5xl" : "text-[28px]"}`}
				keyboardType="decimal-pad"
				value={value}
				onChangeText={(text) => onChange(text.replace(/[^\d.,]/g, ""))}
				placeholder="0"
				placeholderTextColor={muted}
				accessibilityLabel={label}
			/>
		</View>
	);
}
