import { Stack } from "expo-router";
import { useEffect } from "react";
import { refreshReminder } from "@/features/detection/android";
import "@/global.css";

const sheet = {
	presentation: "formSheet",
	headerShown: false,
	sheetAllowedDetents: "fitToContents",
	sheetGrabberVisible: true,
} as const;

export default function RootLayout() {
	useEffect(() => {
		void refreshReminder();
	}, []);

	return (
		<Stack>
			<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			<Stack.Screen name="register" options={sheet} />
			<Stack.Screen name="detection" options={{ headerShown: false }} />
		</Stack>
	);
}
