import { Stack } from "expo-router";
import { useEffect } from "react";
import "@/global.css";
import { ensureReminder } from "../../modules/quipu-detection";

// (tabs) siempre queda debajo: un enlace directo a /register o /detection tiene a dónde volver.
export const unstable_settings = { anchor: "(tabs)" };

const sheet = {
	presentation: "formSheet",
	headerShown: false,
	sheetAllowedDetents: "fitToContents",
	sheetGrabberVisible: true,
} as const;

export default function RootLayout() {
	useEffect(() => {
		void ensureReminder();
	}, []);

	return (
		<Stack>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="register" options={sheet} />
			<Stack.Screen name="detection" options={{ headerShown: false }} />
			<Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
			<Stack.Screen name="(auth)/code" options={{ headerShown: false }} />
		</Stack>
	);
}
