import { Pressable, Text, View } from "react-native";
import AngleRight from "reicon-react-native/icons/AngleRight";
import { useThemeColor } from "@/lib/use-theme-color";

/** The row that opens the day list: what it says on the left, what it shows on the right. */
export function DayRow({
	label,
	value,
	accessibilityLabel,
	onPress,
}: {
	label: string;
	value: string;
	accessibilityLabel: string;
	onPress: () => void;
}) {
	const muted = useThemeColor("--color-muted-foreground");

	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			onPress={onPress}
			className="min-h-14 flex-row items-center justify-between gap-3 border-y border-border py-3"
		>
			<Text
				numberOfLines={1}
				className="min-w-0 shrink text-[15px] leading-5 font-semibold text-foreground"
			>
				{label}
			</Text>
			<View className="shrink-0 flex-row items-center gap-2">
				<Text className="text-sm font-semibold text-foreground">{value}</Text>
				<AngleRight size={18} color={muted} />
			</View>
		</Pressable>
	);
}
