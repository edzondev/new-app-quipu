import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { EmailStep } from "#/modules/auth/components/email-step";
import { OtpStep } from "#/modules/auth/components/otp-step";
import { PasskeyStep } from "#/modules/auth/components/passkey-step";
import { InviteLine } from "#/modules/household/components/invite-line";
import { safeRedirect } from "@quipu/backend/shared/household";

export const Route = createFileRoute("/_auth/sign-in")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: safeRedirect(search.redirect),
	}),
	component: SignInPage,
});

function SignInPage() {
	const { redirect } = Route.useSearch();
	const to = redirect ?? "/home";
	const navigate = useNavigate();
	const [step, setStep] = useState<"email" | "otp" | "passkey">("email");
	const [email, setEmail] = useState("");

	if (step === "otp") {
		return (
			<OtpStep
				email={email}
				redirect={to}
				onChangeEmail={() => setStep("email")}
				onVerified={() => setStep("passkey")}
			/>
		);
	}
	if (step === "passkey") return <PasskeyStep onDone={() => navigate({ to })} />;
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
