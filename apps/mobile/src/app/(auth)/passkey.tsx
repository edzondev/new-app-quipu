import { router } from "expo-router";
import { Text, View } from "react-native";
import Fingerprint from "reicon-react-native/icons/Fingerprint";
import { Button } from "@/components/ui/button";
import { useThemeColor } from "@/lib/use-theme-color";

export default function PasskeySheet() {
	const foreground = useThemeColor("--color-foreground");

	// Luego: passkey real y Primeros pasos al conectar Convex.
	function finish() {
		router.dismissAll();
	}

	return (
		<View className="bg-background px-6 pt-3 pb-6">
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
				<Button label="Activar huella o rostro" onPress={finish} />
				<Button label="Ahora no" variant="secondary" onPress={finish} />
			</View>
		</View>
	);
}
