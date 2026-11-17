import { BottomSheet } from "@expo/ui";
import { Text, View } from "react-native";
import Fingerprint from "reicon-react-native/icons/Fingerprint";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/lib/use-theme-color";

export function PasskeySheet({
	isPresented,
	onDismiss,
}: {
	isPresented: boolean;
	onDismiss: () => void;
}) {
	const foreground = useThemeColor("--color-foreground");
	const background = useThemeColor("--color-background");

	return (
		<BottomSheet isPresented={isPresented} onDismiss={onDismiss} containerColor={background}>
			<View className="px-6 pt-3 pb-6">
				<View className="size-[52px] items-center justify-center rounded-full bg-muted">
					<Fingerprint size={26} color={foreground} />
				</View>
				<Text className="mt-4 text-3xl font-semibold text-foreground">
					Entra más rápido la próxima vez
				</Text>
				<Text className="mt-2 text-sm text-muted-foreground">
					Usa tu huella, rostro o el desbloqueo de tu celular. Sin códigos.
				</Text>
				<View className="mt-6 gap-2">
					<Button label="Activar huella o rostro" onPress={onDismiss} />
					<Button label="Ahora no" variant="secondary" onPress={onDismiss} />
				</View>
			</View>
		</BottomSheet>
	);
}
