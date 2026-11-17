import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { useConvexAuth } from "convex/react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "@/global.css";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/lib/convex";
import { ensureReminder } from "../../modules/quipu-detection";

// The splash stays until the session says which screens exist.
void SplashScreen.preventAutoHideAsync();

// (tabs) siempre queda debajo: un enlace directo a /register o /detection tiene a dónde volver.
export const unstable_settings = { anchor: "(tabs)" };

const sheet = {
	presentation: "formSheet",
	sheetAllowedDetents: "fitToContents",
	sheetGrabberVisible: true,
} as const;

function Screens() {
	const { isLoading, isAuthenticated } = useConvexAuth();

	useEffect(() => {
		if (!isLoading) void SplashScreen.hideAsync();
	}, [isLoading]);

	if (isLoading) return null;

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Protected guard={!isAuthenticated}>
				<Stack.Screen name="(auth)" />
			</Stack.Protected>
			{/* (auth) has no index, so the default fallback would point at "/", which is (tabs). */}
			<Stack.Protected guard={isAuthenticated} redirectTo="/sign-in">
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
				<Stack.Screen name="register" options={sheet} />
				<Stack.Screen name="detection" />
				<Stack.Screen name="settings/index" />
				<Stack.Screen name="settings/security" />
				<Stack.Screen name="plan" />
				<Stack.Screen name="report" />
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
