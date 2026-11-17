import { router } from "expo-router";

export function leaveToSignIn() {
	router.dismissAll();
	router.push("/sign-in");
}
