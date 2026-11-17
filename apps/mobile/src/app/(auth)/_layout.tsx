import { Stack } from "expo-router";

// Without this, Expo Router opens the first route alphabetically (code) instead of sign-in.
export const unstable_settings = { anchor: "sign-in" };

export default function AuthLayout() {
	return <Stack screenOptions={{ headerShown: false }} />;
}
