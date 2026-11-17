import { Text, View } from "react-native";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";

export function ConfirmSheet({
	isPresented,
	title,
	body,
	confirmLabel,
	onConfirm,
	onDismiss,
}: {
	isPresented: boolean;
	title: string;
	body?: string;
	confirmLabel: string;
	onConfirm: () => void;
	onDismiss: () => void;
}) {
	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
			<Text className="text-3xl leading-9 font-semibold text-foreground">{title}</Text>
			{body ? <Text className="mt-2 text-sm text-muted-foreground">{body}</Text> : null}
			<View className="mt-6 gap-2">
				<Button label={confirmLabel} onPress={onConfirm} />
				<Button label="Cancelar" variant="secondary" onPress={onDismiss} />
			</View>
		</BottomSheet>
	);
}
