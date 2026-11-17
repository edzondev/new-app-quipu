import { View } from "react-native";

export function ProgressBar({
	percent,
	height,
	fill,
}: {
	percent: number;
	height: "h-1.5" | "h-[5px]";
	fill: string;
}) {
	return (
		<View className={`${height} overflow-hidden rounded-full bg-border`}>
			<View className={`h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
		</View>
	);
}
