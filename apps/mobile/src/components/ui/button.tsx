import { Pressable, Text } from "react-native";

const VARIANTS = {
	primary: { box: "bg-primary", text: "text-primary-foreground" },
	secondary: { box: "bg-secondary", text: "text-secondary-foreground" },
	warning: { box: "border border-warning", text: "text-warning-foreground" },
} as const;

export function Button({
	label,
	onPress,
	disabled = false,
	variant = "primary",
	accessibilityHint,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	variant?: keyof typeof VARIANTS;
	accessibilityHint?: string;
}) {
	const { box, text } = VARIANTS[variant];
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityState={{ disabled }}
			accessibilityHint={accessibilityHint}
			disabled={disabled}
			onPress={onPress}
			className={`items-center justify-center rounded-full px-4 py-3.5 ${box} ${disabled ? "opacity-50" : ""}`}
		>
			<Text className={`text-[15px] font-semibold ${text}`}>{label}</Text>
		</Pressable>
	);
}
