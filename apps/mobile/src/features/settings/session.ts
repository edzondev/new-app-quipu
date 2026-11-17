import { router } from "expo-router";

/** Luego: cerrar la sesión de verdad con Better Auth. Por ahora solo vuelve a la entrada. */
export function leaveToSignIn() {
	router.dismissAll();
	router.push("/sign-in");
}
