import { type BottomSheetProps, BottomSheet as ExpoBottomSheet, RNHostView } from "@expo/ui";
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
			{/* The sheet is its own Compose window: React Native content has to be hosted to be sized and to get touches and scroll. */}
			<RNHostView matchContents={{ vertical: true }}>
				<View className="px-6 pt-2.5 pb-6">
					<View className="mb-3.5 h-[5px] w-10 self-center rounded-full bg-input" />
					{children}
				</View>
			</RNHostView>
		</ExpoBottomSheet>
	);
}
