import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { EmailStep } from "#/modules/auth/components/email-step";
import { OtpStep } from "#/modules/auth/components/otp-step";
import { PasskeyStep } from "#/modules/auth/components/passkey-step";

export const Route = createFileRoute("/_auth/sign-in")({
	component: SignInPage,
});

function SignInPage() {
	const [step, setStep] = useState<"email" | "otp" | "passkey">("email");
	const [email, setEmail] = useState("");

	if (step === "otp") {
		return (
			<OtpStep
				email={email}
				onChangeEmail={() => setStep("email")}
				onVerified={() => setStep("passkey")}
			/>
		);
	}
	if (step === "passkey") return <PasskeyStep next="/home" />;
	return (
		<EmailStep
			defaultEmail={email}
			onSent={(sentTo) => {
				setEmail(sentTo);
				setStep("otp");
			}}
		/>
	);
}
