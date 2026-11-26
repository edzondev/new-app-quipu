import { RNHostView } from "@expo/ui";
import { Host, ModalBottomSheet, type ModalBottomSheetRef } from "@expo/ui/jetpack-compose";
import { imePadding } from "@expo/ui/jetpack-compose/modifiers";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";
import { useThemeColor } from "@/lib/use-theme-color";

const StyledHost = withUniwind(Host);

// The sheet is its own Compose window: keyboard-controller only follows the activity's window
// and React Native's Modal, so the sheet itself lifts above the keyboard with Compose's `imePadding`.
const KEYBOARD_MODIFIERS = [imePadding()];

/**
 * Compose's `ModalBottomSheet` without its half-height state, which `@expo/ui`'s `BottomSheet` only
 * skips by filling the screen: once dragged from half to full, the hosted content stopped getting touches.
 */
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
	const sheetRef = useRef<ModalBottomSheetRef>(null);
	const [mounted, setMounted] = useState(isPresented);
	if (isPresented && !mounted) setMounted(true);

	// Closing from React (a save, a cancel) slides the sheet down before it unmounts, like `@expo/ui`'s.
	useEffect(() => {
		if (isPresented) return;
		let cancelled = false;
		void sheetRef.current?.hide().then(() => {
			if (!cancelled) setMounted(false);
		});
		return () => {
			cancelled = true;
		};
	}, [isPresented]);

	if (!mounted) return null;

	return (
		<StyledHost className="absolute inset-0" pointerEvents="none">
			<ModalBottomSheet
				ref={sheetRef}
				onDismissRequest={onDismiss}
				skipPartiallyExpanded
				showDragHandle={false}
				containerColor={background}
				modifiers={KEYBOARD_MODIFIERS}
			>
				{/* The sheet is its own Compose window: React Native content has to be hosted to be sized and to get touches and scroll. */}
				<RNHostView matchContents={{ vertical: true }}>
					<View className="px-6 pt-2.5 pb-6">
						<View className="mb-3.5 h-[5px] w-10 self-center rounded-full bg-input" />
						{children}
					</View>
				</RNHostView>
			</ModalBottomSheet>
		</StyledHost>
	);
}
