import { passkeyClient } from "@better-auth/passkey/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { safeRedirect } from "@quipu/backend/shared/household";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [convexClient(), emailOTPClient(), passkeyClient()],
});

// Used both to sign in and to sign out: every session change is a full page load. The server reads the new cookie and the Convex client
// starts with its token (or paused, waiting for one). Changing session in memory leaves Convex queries
// running without the new token, and /_app sends a signed-in person to /onboarding.
// The promise never settles, so a caller awaiting it keeps its button loading until the page leaves.
// `to` comes from ?redirect=: anything that would leave the site goes to Inicio.
export function reloadTo(to: string) {
	window.location.assign(safeRedirect(to));
	return new Promise<never>(() => {});
}

// One flow for everyone: asking for a code creates nothing; the account is made when the code is verified.
export function sendSignInCode(email: string) {
	return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
}
