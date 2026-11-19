import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";

export function Chips({
	options,
	selectedIndex,
	onChange,
}: {
	options: readonly string[];
	selectedIndex: number;
	onChange: (index: number) => void;
}) {
	return (
		<View className="flex-row flex-wrap gap-2">
			{options.map((label, index) => {
				const selected = index === selectedIndex;
				return (
					<Pressable
						key={label}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						onPress={() => {
							if (selected) return;
							void Haptics.selectionAsync();
							onChange(index);
						}}
						className={`min-h-11 items-center justify-center rounded-full px-4 ${selected ? "bg-foreground" : "bg-secondary"}`}
					>
						<Text
							className={`text-[13.5px] font-semibold ${selected ? "text-background" : "text-foreground"}`}
							numberOfLines={1}
						>
							{label}
						</Text>
					</Pressable>
				);
			})}
		</View>
	);
}
