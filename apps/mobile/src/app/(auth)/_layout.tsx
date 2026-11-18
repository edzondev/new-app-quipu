import { Stack } from "expo-router";

// Ancla en sign-in: es la primera pantalla cuando no hay sesión.
export const unstable_settings = { anchor: "sign-in" };

export default function AuthLayout() {
	return <Stack screenOptions={{ headerShown: false }} />;
}
