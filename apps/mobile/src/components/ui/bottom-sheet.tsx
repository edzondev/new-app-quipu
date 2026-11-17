import { type BottomSheetProps, BottomSheet as ExpoBottomSheet } from "@expo/ui";
import { View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

export function BottomSheet({ children, ...props }: BottomSheetProps) {
	const background = useThemeColor("--color-background");

	return (
		<ExpoBottomSheet
			containerColor={background}
			showDragIndicator={false}
			contentPadding={0}
			{...props}
		>
			<View className="px-6 pt-3 pb-6">
				<View className="mb-5 h-1 w-9 self-center rounded-full bg-input" />
				{children}
			</View>
		</ExpoBottomSheet>
	);
}
