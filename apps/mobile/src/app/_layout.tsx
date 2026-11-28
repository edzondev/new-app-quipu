import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
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
import { queryClient } from "@/lib/query-client";
import { ensureReminder } from "../../modules/quipu-detection";

// (tabs) siempre queda debajo: un enlace directo a /register o /detection tiene a dónde volver.
export const unstable_settings = { anchor: "(tabs)" };

const sheetOptions = {
	presentation: "transparentModal",
	animation: "none",
} as const;

// A long form covers the tabs and rises from below. On iOS only ✕ closes it, so unsaved changes always ask.
const fullScreenFormOptions = {
	presentation: "fullScreenModal",
	animation: "slide_from_bottom",
	gestureEnabled: false,
} as const;

function Screens() {
	const { isLoading, isAuthenticated } = useConvexAuth();

	// The cache must not outlive the session: whoever signs in next starts with nothing from this one.
	useEffect(() => {
		if (!isLoading && !isAuthenticated) queryClient.clear();
	}, [isLoading, isAuthenticated]);

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
				<Stack.Screen name="register" options={fullScreenFormOptions} />
				<Stack.Screen name="plus" options={sheetOptions} />
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
				<QueryClientProvider client={queryClient}>
					<StatusBar style={theme === "dark" ? "light" : "dark"} />
					<Screens />
				</QueryClientProvider>
			</ConvexBetterAuthProvider>
		</KeyboardProvider>
	);
}
