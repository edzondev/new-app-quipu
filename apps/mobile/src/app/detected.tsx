import { router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/button";
import { parseDetected } from "@/features/detection/params";
import { RegisterForm } from "@/features/register/form";

export default function DetectedScreen() {
	const detected = parseDetected(useLocalSearchParams());
	if (!detected) {
		return (
			<View className="bg-background px-6 pt-6 pb-6">
				<Text className="text-base text-foreground">No pudimos leer ese aviso.</Text>
				<View className="mt-4">
					<Button label="Registrar a mano" onPress={() => router.replace("/register")} />
				</View>
			</View>
		);
	}
	return <RegisterForm detected={detected} />;
}
