import { router } from "expo-router";
import { authClient } from "@/lib/auth-client";

export async function leaveToSignIn() {
	await authClient.signOut();
	router.replace("/sign-in");
}
