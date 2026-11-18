import { router } from "expo-router";
import { Alert } from "react-native";
import { authClient } from "@/lib/auth-client";

export async function leaveToSignIn() {
	try {
		const { error } = await authClient.signOut();
		if (error) throw error;
	} catch {
		Alert.alert("No pudimos cerrar tu sesión. Intenta de nuevo.");
		return;
	}
	router.replace("/sign-in");
}
