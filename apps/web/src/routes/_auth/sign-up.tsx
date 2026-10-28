import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DetailsStep } from "#/modules/auth/components/details-step";
import { OtpStep } from "#/modules/auth/components/otp-step";
import { PasskeyStep } from "#/modules/auth/components/passkey-step";

export const Route = createFileRoute("/_auth/sign-up")({
	validateSearch: (search: Record<string, unknown>) => ({
		email: typeof search.email === "string" ? search.email : "",
	}),
	component: SignUpPage,
});

function SignUpPage() {
	const { email: prefilledEmail } = Route.useSearch();
	const [step, setStep] = useState<"details" | "otp" | "passkey">("details");
	const [details, setDetails] = useState({ name: "", email: prefilledEmail });

	if (step === "otp") {
		return (
			<OtpStep
				email={details.email}
				name={details.name}
				onChangeEmail={() => setStep("details")}
				onVerified={() => setStep("passkey")}
			/>
		);
	}
	// An existing email just signs in here; /onboarding sends them on to /home if they have a plan.
	if (step === "passkey") return <PasskeyStep next="/onboarding" />;
	return (
		<DetailsStep
			defaultValues={details}
			onSent={(sent) => {
				setDetails(sent);
				setStep("otp");
			}}
		/>
	);
}
