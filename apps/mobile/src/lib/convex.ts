import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) throw new Error("Falta EXPO_PUBLIC_CONVEX_URL");

// expectAuth: queries wait for the session instead of running as a signed-out person.
export const convex = new ConvexReactClient(url, {
	expectAuth: true,
	unsavedChangesWarning: false,
});
