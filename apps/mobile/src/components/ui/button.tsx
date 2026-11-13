import { Pressable, Text } from "react-native";

export function Button({
	label,
	onPress,
	disabled = false,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			disabled={disabled}
			onPress={onPress}
			className={`items-center justify-center rounded-full bg-primary px-4 py-3.5 ${disabled ? "opacity-50" : ""}`}
		>
			<Text className="text-[15px] font-semibold text-primary-foreground">{label}</Text>
		</Pressable>
	);
}
