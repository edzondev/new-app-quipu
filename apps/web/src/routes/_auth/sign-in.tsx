import { safeRedirect } from "@quipu/backend/shared/household";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useState } from "react";
import { authClient } from "#/lib/auth-client";
import { EmailStep } from "#/modules/auth/components/email-step";
import { OtpStep } from "#/modules/auth/components/otp-step";
import { PasskeyStep } from "#/modules/auth/components/passkey-step";
import { InviteLine } from "#/modules/household/components/invite-line";

export const Route = createFileRoute("/_auth/sign-in")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: safeRedirect(search.redirect),
	}),
	component: SignInPage,
});

function SignInPage() {
	const { redirect } = Route.useSearch();
	const to = redirect ?? "/home";
	const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
	const [step, setStep] = useState<"email" | "otp" | "passkey">("email");
	const [email, setEmail] = useState("");
	const [isDone, setIsDone] = useState(false);

	// Any valid code (new or existing account) offers a key once, if this person has none and the browser can make one.
	// Any failure here skips the offer: it never blocks. /onboarding takes over if there is no plan yet.
	async function afterCode() {
		const canCreate = typeof PublicKeyCredential !== "undefined";
		const { data } = canCreate ? await authClient.passkey.listUserPasskeys() : { data: null };
		if (data?.length === 0) setStep("passkey");
		else setIsDone(true);
	}

	// Navigate only once Convex confirms the new session: before that myProfile runs without a token,
	// returns null and /_app sends the user to /onboarding.
	if (isDone && isConvexAuthenticated) return <Navigate to={to} />;
	if (step === "otp") {
		return <OtpStep email={email} onChangeEmail={() => setStep("email")} onVerified={afterCode} />;
	}
	if (step === "passkey") return <PasskeyStep onDone={() => setIsDone(true)} />;
	return (
		<>
			<InviteLine redirect={to} action="Entra" />
			<EmailStep
				redirect={to}
				defaultEmail={email}
				onSent={(sentTo) => {
					setEmail(sentTo);
					setStep("otp");
				}}
			/>
		</>
	);
}
