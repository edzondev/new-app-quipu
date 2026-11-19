import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { useConvexAuth } from "convex/react";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "@/global.css";
import { StatusBar } from "expo-status-bar";
import { useUniwind } from "uniwind";
import { authClient } from "@/lib/auth-client";
import { convex } from "@/lib/convex";
import { ensureReminder } from "../../modules/quipu-detection";

// (tabs) siempre queda debajo: un enlace directo a /register o /detection tiene a dónde volver.
export const unstable_settings = { anchor: "(tabs)" };

const registerOptions = {
	presentation: "transparentModal",
	animation: "none",
} as const;

function Screens() {
	const { isLoading, isAuthenticated } = useConvexAuth();

	// Convex reports isLoading at start and again on every session change, until the server confirms the token.
	if (isLoading) {
		return (
			<View className="flex-1 items-center justify-center bg-background">
				<ActivityIndicator size="large" colorClassName="accent-foreground" />
			</View>
		);
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Protected guard={!isAuthenticated}>
				<Stack.Screen name="(auth)" />
			</Stack.Protected>
			{/* (auth) has no index, so the default fallback would point at "/", which is (tabs). */}
			<Stack.Protected guard={isAuthenticated} redirectTo="/sign-in">
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
				<Stack.Screen name="register" options={registerOptions} />
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
	const { theme } = useUniwind();
	useEffect(() => {
		void ensureReminder();
	}, []);

	return (
		<KeyboardProvider>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				<StatusBar style={theme === "dark" ? "light" : "dark"} />
				<Screens />
			</ConvexBetterAuthProvider>
		</KeyboardProvider>
	);
}
