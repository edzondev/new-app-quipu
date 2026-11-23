import { RNHostView } from "@expo/ui";
import { Column, Host, ModalBottomSheet } from "@expo/ui/jetpack-compose";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useThemeColor } from "@/lib/use-theme-color";

export function BottomSheet({
	isPresented,
	onDismiss,
	children,
}: {
	isPresented: boolean;
	onDismiss: () => void;
	children?: ReactNode;
}) {
	const background = useThemeColor("--color-background");

	if (!isPresented) return null;

	return (
		<Host style={StyleSheet.absoluteFill} pointerEvents="none">
			<ModalBottomSheet
				onDismissRequest={onDismiss}
				skipPartiallyExpanded
				showDragHandle={false}
				containerColor={background}
			>
				<Column>
					<RNHostView matchContents={{ vertical: true }}>
						<View className="px-6 pt-2.5 pb-6">
							<View className="mb-3.5 h-[5px] w-10 self-center rounded-full bg-input" />
							{children}
						</View>
					</RNHostView>
				</Column>
			</ModalBottomSheet>
		</Host>
	);
}
