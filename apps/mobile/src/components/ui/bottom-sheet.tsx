import { BottomSheet as ExpoBottomSheet, RNHostView } from "@expo/ui";
import { imePadding } from "@expo/ui/jetpack-compose/modifiers";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

// On Android the sheet is its own window: it lifts above the keyboard with Compose's `imePadding`.
// SwiftUI's sheet does that by itself, and its modifiers are SwiftUI's, so iOS gets none.
const KEYBOARD_MODIFIERS = Platform.OS === "android" ? [imePadding()] : undefined;

/** Expo UI's sheet, as tall as its content, with its own handle and Quipu's background and margins. */
export function BottomSheet({
	isPresented,
	onDismiss,
	children,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	children: ReactNode;
}) {
	const background = useThemeColor("--color-background");

	return (
		<ExpoBottomSheet
			isPresented={isPresented}
			onDismiss={onDismiss}
			contentPadding={0}
			containerColor={background}
			modifiers={KEYBOARD_MODIFIERS}
		>
			<RNHostView matchContents={{ vertical: true }}>
				<View className="px-6 pb-6">{children}</View>
			</RNHostView>
		</ExpoBottomSheet>
	);
}
