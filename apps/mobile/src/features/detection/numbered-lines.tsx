import { Text, View } from "react-native";

export function NumberedLines({ lines }: { lines: readonly string[] }) {
	return (
		<View className="mt-5 gap-3">
			{lines.map((line, index) => (
				<View key={line} className="flex-row gap-3">
					<Text className="font-mono text-[13px] text-muted-foreground">0{index + 1}</Text>
					<Text className="flex-1 text-[15px] text-foreground">{line}</Text>
				</View>
			))}
		</View>
	);
}
