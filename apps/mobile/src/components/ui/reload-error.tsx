import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";

/** A screen that could not load: says what failed and offers to ask again. */
export function ReloadError({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<View accessibilityRole="alert" className="gap-3 pt-6">
			<Text className="text-[15px] font-semibold text-warning-foreground">{message}</Text>
			<Button label="Reintentar" variant="secondary" onPress={onRetry} />
		</View>
	);
}
