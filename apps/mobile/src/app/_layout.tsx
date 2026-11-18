import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { useConvexAuth } from "convex/react";
import { Stack, useGlobalSearchParams, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "@/global.css";
import { afterSignInHref } from "@/features/auth/after-sign-in-href";
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
	const pathname = usePathname();
	// sign-in and verify-code carry the ?redirect= the guard below put there.
	const { redirect } = useGlobalSearchParams<{ redirect?: string }>();

	useEffect(() => {
		if (!isLoading) void SplashScreen.hideAsync();
	}, [isLoading]);

	if (isLoading) return null;

	return (
		<Stack screenOptions={{ headerShown: false }}>
			{/* After a good code the session flips and this guard sends the person back to where they came from. */}
			<Stack.Protected guard={!isAuthenticated} redirectTo={afterSignInHref(redirect)}>
				<Stack.Screen name="(auth)" />
			</Stack.Protected>
			{/* (auth) has no index, so the default fallback would point at "/", which is (tabs). */}
			<Stack.Protected
				guard={isAuthenticated}
				redirectTo={{ pathname: "/sign-in", params: { redirect: pathname } }}
			>
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
