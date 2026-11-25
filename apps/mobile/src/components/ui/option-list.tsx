import { Pressable, ScrollView, Text } from "react-native";
import Check from "reicon-react-native/icons/Check";
import { useThemeColor } from "@/lib/use-theme-color";

const ROW_HEIGHT = 48;
const MAX_LIST_HEIGHT = ROW_HEIGHT * 7.5;

/** One option to pick, in a list that scrolls inside a sheet (a fixed height lets it scroll there). */
export function OptionList({
	options,
	value,
	onPick,
}: {
	options: readonly { value: string; label: string }[];
	value: string;
	onPick: (value: string) => void;
}) {
	const foreground = useThemeColor("--color-foreground");

	return (
		<ScrollView style={{ height: Math.min(options.length * ROW_HEIGHT, MAX_LIST_HEIGHT) }}>
			{options.map((option) => {
				const selected = option.value === value;
				return (
					<Pressable
						key={option.value}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						onPress={() => onPick(option.value)}
						className="min-h-12 flex-row items-center justify-between border-b border-border active:opacity-60"
					>
						<Text className={`text-base text-foreground ${selected ? "font-bold" : "font-medium"}`}>
							{option.label}
						</Text>
						{selected ? <Check size={20} color={foreground} /> : null}
					</Pressable>
				);
			})}
		</ScrollView>
	);
}
