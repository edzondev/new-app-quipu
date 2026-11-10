import { passkeyClient } from "@better-auth/passkey/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [convexClient(), emailOTPClient(), passkeyClient()],
});

// Every session change is a full page load: the server reads the new cookie and the Convex client
// starts with its token (or paused, waiting for one). Changing session in memory leaves Convex queries
// running without the new token, and /_app sends a signed-in person to /onboarding.
// The promise never settles, so a caller awaiting it keeps its button loading until the page leaves.
export function enterApp(to: string) {
	window.location.assign(to);
	return new Promise<never>(() => {});
}

// One flow for everyone: asking for a code creates nothing; the account is made when the code is verified.
export function sendSignInCode(email: string) {
	return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
}
