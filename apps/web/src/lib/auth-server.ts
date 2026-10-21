import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

type Puente = ReturnType<typeof convexBetterAuthReactStart>;

let puente: Puente | undefined;

function leerPuente() {
	if (puente) return puente;
	const convexUrl = import.meta.env.VITE_CONVEX_URL;
	const convexSiteUrl = import.meta.env.VITE_CONVEX_SITE_URL;
	if (!convexUrl || !convexSiteUrl) {
		throw new Error("Faltan VITE_CONVEX_URL y VITE_CONVEX_SITE_URL");
	}
	puente = convexBetterAuthReactStart({ convexUrl, convexSiteUrl });
	return puente;
}

export const handler: Puente["handler"] = (request) => leerPuente().handler(request);
export const getToken: Puente["getToken"] = () => leerPuente().getToken();
export const fetchAuthQuery: Puente["fetchAuthQuery"] = (query, ...args) =>
	leerPuente().fetchAuthQuery(query, ...args);
export const fetchAuthMutation: Puente["fetchAuthMutation"] = (mutation, ...args) =>
	leerPuente().fetchAuthMutation(mutation, ...args);
export const fetchAuthAction: Puente["fetchAuthAction"] = (action, ...args) =>
	leerPuente().fetchAuthAction(action, ...args);
