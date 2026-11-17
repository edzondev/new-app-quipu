import { type BottomSheetProps, BottomSheet as ExpoBottomSheet } from "@expo/ui";
import type { PropsWithChildren } from "react";
import { View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

type Props = BottomSheetProps &
	PropsWithChildren<{
		isPresented: boolean;
		onDismiss: () => void;
	}>;

export function BottomSheet({ isPresented, onDismiss, children, ...props }: Props) {
	const background = useThemeColor("--color-background");

	return (
		<ExpoBottomSheet
			isPresented={isPresented}
			onDismiss={onDismiss}
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
