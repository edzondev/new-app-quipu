import { passkeyClient } from "@better-auth/passkey/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	plugins: [convexClient(), emailOTPClient(), passkeyClient()],
});

// Sign-in and sign-up both use the "sign-in" OTP; the server decides whether a new account is allowed.
export function sendSignInCode(email: string) {
	return authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
}
