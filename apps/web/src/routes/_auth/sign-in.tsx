import { safeRedirect } from "@quipu/backend/shared/household";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient, reloadTo } from "#/lib/auth-client";
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
	const [step, setStep] = useState<"email" | "otp" | "passkey">("email");
	const [email, setEmail] = useState("");

	// Any valid code (new or existing account) offers a key once, if this person has none and the browser can make one.
	// Any failure here skips the offer: it never blocks. /onboarding takes over if there is no plan yet.
	async function afterCode() {
		const canCreate = typeof PublicKeyCredential !== "undefined";
		const { data } = canCreate ? await authClient.passkey.listUserPasskeys() : { data: null };
		if (data?.length === 0) setStep("passkey");
		else await reloadTo(to);
	}

	if (step === "otp") {
		return <OtpStep email={email} onChangeEmail={() => setStep("email")} onVerified={afterCode} />;
	}
	if (step === "passkey") return <PasskeyStep onDone={() => void reloadTo(to)} />;
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
