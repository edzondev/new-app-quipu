import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "@/global.css";
import { useGate } from "@/features/auth/gate";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/lib/convex";
import { ensureReminder } from "../../modules/quipu-detection";

// The splash stays until the session and the profile say which screens exist.
void SplashScreen.preventAutoHideAsync();

// (tabs) siempre queda debajo: un enlace directo a /register o /detection tiene a dónde volver.
export const unstable_settings = { anchor: "(tabs)" };

const sheet = {
	presentation: "formSheet",
	headerShown: false,
	sheetAllowedDetents: "fitToContents",
	sheetGrabberVisible: true,
} as const;

function Screens() {
	const gate = useGate();

	useEffect(() => {
		if (gate !== "loading") void SplashScreen.hideAsync();
	}, [gate]);

	if (gate === "loading") return null;

	return (
		<Stack>
			<Stack.Protected guard={gate === "signed-out"}>
				<Stack.Screen name="(auth)" options={{ headerShown: false }} />
			</Stack.Protected>
			<Stack.Protected guard={gate === "onboarding"}>
				<Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
			</Stack.Protected>
			<Stack.Protected guard={gate === "app"}>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="register" options={sheet} />
				<Stack.Screen name="detection" options={{ headerShown: false }} />
				<Stack.Screen name="settings/index" options={{ headerShown: false }} />
				<Stack.Screen name="settings/security" options={{ headerShown: false }} />
				<Stack.Screen name="plan" options={{ headerShown: false }} />
				<Stack.Screen name="report" options={{ headerShown: false }} />
			</Stack.Protected>
		</Stack>
	);
}

export default function RootLayout() {
	useEffect(() => {
		void ensureReminder();
	}, []);

	return (
		<ConvexBetterAuthProvider client={convex} authClient={authClient}>
			<Screens />
		</ConvexBetterAuthProvider>
	);
}
