import { Alert } from "react-native";
import { authClient } from "@/lib/auth-client";

// The session change moves the guard in _layout.tsx to sign-in by itself.
export async function signOut() {
	try {
		const { error } = await authClient.signOut();
		if (error) throw error;
	} catch {
		Alert.alert("No pudimos cerrar tu sesión. Intenta de nuevo.");
	}
}
