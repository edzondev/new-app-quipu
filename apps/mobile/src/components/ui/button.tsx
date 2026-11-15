import { Pressable, Text } from "react-native";

export function Button({
	label,
	onPress,
	disabled = false,
	variant = "primary",
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	variant?: "primary" | "secondary";
}) {
	const primary = variant === "primary";
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			disabled={disabled}
			onPress={onPress}
			className={`items-center justify-center rounded-full px-4 py-3.5 ${primary ? "bg-primary" : "bg-secondary"} ${disabled ? "opacity-50" : ""}`}
		>
			<Text
				className={`text-[15px] font-semibold ${primary ? "text-primary-foreground" : "text-secondary-foreground"}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}
