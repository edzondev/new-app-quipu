import { type BottomSheetProps, BottomSheet as ExpoBottomSheet, RNHostView } from "@expo/ui";
import { imePadding } from "@expo/ui/jetpack-compose/modifiers";
import { Platform, View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

// On Android the sheet is its own Compose window: keyboard-controller only follows the activity's window
// and React Native's Modal, so the sheet itself lifts above the keyboard with Compose's `imePadding`.
const KEYBOARD_MODIFIERS = Platform.OS === "android" ? [imePadding()] : undefined;

export function BottomSheet({ children, ...props }: BottomSheetProps) {
	const background = useThemeColor("--color-background");

	return (
		<ExpoBottomSheet
			containerColor={background}
			showDragIndicator={false}
			contentPadding={0}
			modifiers={KEYBOARD_MODIFIERS}
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
