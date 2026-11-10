import { passkeyClient } from "@better-auth/passkey/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [convexClient(), emailOTPClient(), passkeyClient()],
});

// One flow for everyone: asking for a code creates nothing; the account is made when the code is verified.
export function sendSignInCode(email: string) {
	return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
}
