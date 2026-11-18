import { ActivityIndicator, Text } from "react-native";
import Animated from "react-native-reanimated";
import { PressableScale } from "@/components/ui/pressable-scale";
import { fadeIn } from "@/lib/motion";

const VARIANTS = {
	primary: {
		box: "bg-primary",
		text: "text-primary-foreground",
		spinner: "accent-primary-foreground",
	},
	secondary: {
		box: "bg-secondary",
		text: "text-secondary-foreground",
		spinner: "accent-secondary-foreground",
	},
	warning: {
		box: "border border-warning",
		text: "text-warning-foreground",
		spinner: "accent-warning-foreground",
	},
} as const;

export function Button({
	label,
	onPress,
	disabled = false,
	loading = false,
	variant = "primary",
	accessibilityHint,
}: {
	label: string;
	onPress: () => void;
	disabled?: boolean;
	/** Keeps the button's size: the label stays in place, hidden, under a spinner. */
	loading?: boolean;
	variant?: keyof typeof VARIANTS;
	accessibilityHint?: string;
}) {
	const { box, text, spinner } = VARIANTS[variant];
	const inactive = disabled || loading;
	return (
		<PressableScale
			accessibilityRole="button"
			accessibilityState={{ disabled: inactive, busy: loading }}
			accessibilityHint={accessibilityHint}
			disabled={inactive}
			onPress={onPress}
			className={`h-[52px] items-center justify-center rounded-full px-[26px] ${box} ${disabled ? "opacity-50" : ""}`}
		>
			<Text className={`text-[15px] font-semibold ${text} ${loading ? "opacity-0" : ""}`}>
				{label}
			</Text>
			{loading ? (
				<Animated.View entering={fadeIn} className="absolute inset-0 items-center justify-center">
					<ActivityIndicator colorClassName={spinner} />
				</Animated.View>
			) : null}
		</PressableScale>
	);
}
