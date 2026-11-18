import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const siteUrl = process.env.EXPO_PUBLIC_CONVEX_SITE_URL;
if (!siteUrl) throw new Error("Falta EXPO_PUBLIC_CONVEX_SITE_URL");

const scheme = Constants.expoConfig?.scheme;
if (typeof scheme !== "string") throw new Error("Falta scheme en app.json");

export const authClient = createAuthClient({
	baseURL: siteUrl,
	plugins: [
		convexClient(),
		emailOTPClient(),
		expoClient({ scheme, storagePrefix: scheme, storage: SecureStore }),
	],
});

// One flow for everyone: asking for a code creates nothing; the account is made when the code is verified.
export function sendSignInCode(email: string) {
	return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
}
