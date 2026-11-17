import { BottomSheet as ExpoBottomSheet } from "@expo/ui";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

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
			containerColor={background}
			showDragIndicator={false}
			contentPadding={0}
		>
			<View className="px-6 pt-3 pb-6">
				<View className="mb-5 h-1 w-9 self-center rounded-full bg-input" />
				{children}
			</View>
		</ExpoBottomSheet>
	);
}
