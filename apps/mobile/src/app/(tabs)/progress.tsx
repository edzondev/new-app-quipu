import { TAB_BAR_SPACE } from "@/features/navigation/tab-bar";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProgressScreen() {
	const insets = useSafeAreaInsets();

	return (
		<View
			className="flex-1 items-center justify-center bg-background"
			style={{ paddingBottom: insets.bottom + TAB_BAR_SPACE }}
		>
			<Text className="text-foreground">Progreso</Text>
		</View>
	);
}
