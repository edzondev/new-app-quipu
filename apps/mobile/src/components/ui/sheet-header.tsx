import { Text, View } from "react-native";

/** A sheet closes with its gesture, so the header has no close button. */
export function SheetHeader({ title, sub }: { title: string; sub?: string }) {
	return (
		<View className="min-h-11 justify-center">
			<Text className="text-2xl font-semibold text-foreground">{title}</Text>
			{sub ? (
				<Text className="mt-1 text-[13px] leading-[19px] text-muted-foreground">{sub}</Text>
			) : null}
		</View>
	);
}
