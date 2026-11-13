import { Pressable, Text, View } from "react-native";

export function Segmented({
	options,
	selectedIndex,
	onChange,
}: {
	options: readonly string[];
	selectedIndex: number;
	onChange: (index: number) => void;
}) {
	return (
		<View className="flex-row rounded-full bg-muted p-1">
			{options.map((label, index) => {
				const selected = index === selectedIndex;
				return (
					<Pressable
						key={label}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						accessibilityLabel={label}
						onPress={() => onChange(index)}
						className={`min-h-11 flex-1 items-center justify-center rounded-full px-2 ${selected ? "bg-background" : ""}`}
					>
						<Text
							className={`text-[13px] font-semibold ${selected ? "text-foreground" : "text-muted-foreground"}`}
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
