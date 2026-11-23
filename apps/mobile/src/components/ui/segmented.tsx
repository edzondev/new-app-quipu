import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";

const SIZES = {
	md: {
		container: "flex-row rounded-full bg-muted p-1",
		item: "min-h-11 flex-1 px-2",
		label: "text-[13px]",
	},
	sm: {
		container: "min-h-11 flex-row items-center gap-0.5 rounded-full bg-muted p-1",
		item: "h-9 shrink px-3",
		label: "text-[12.5px]",
	},
} as const;

export function Segmented({
	options,
	selectedIndex,
	onChange,
	size = "md",
}: {
	options: readonly string[];
	selectedIndex: number;
	onChange: (index: number) => void;
	size?: keyof typeof SIZES;
}) {
	const classes = SIZES[size];

	return (
		<View className={classes.container}>
			{options.map((label, index) => {
				const selected = index === selectedIndex;
				return (
					<Pressable
						key={label}
						accessibilityRole="button"
						accessibilityState={{ selected }}
						accessibilityLabel={label}
						hitSlop={4}
						onPress={() => {
							if (selected) return;
							void Haptics.selectionAsync();
							onChange(index);
						}}
						className={`items-center justify-center rounded-full ${classes.item} ${selected ? "bg-background shadow-sm dark:shadow-none" : ""}`}
					>
						<Text
							className={`font-semibold ${classes.label} ${selected ? "text-foreground" : "text-muted-foreground"}`}
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
