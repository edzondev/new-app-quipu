import { safeRedirect } from "@quipu/backend/shared/household";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { DetailsStep } from "#/modules/auth/components/details-step";
import { OtpStep } from "#/modules/auth/components/otp-step";
import { PasskeyStep } from "#/modules/auth/components/passkey-step";
import { InviteLine } from "#/modules/household/components/invite-line";

export const Route = createFileRoute("/_auth/sign-up")({
	validateSearch: (search: Record<string, unknown>): { email: string; redirect?: string } => ({
		email: typeof search.email === "string" ? search.email : "",
		redirect: safeRedirect(search.redirect),
	}),
	component: SignUpPage,
});

function SignUpPage() {
	const { email: prefilledEmail, redirect = "/home" } = Route.useSearch();
	const navigate = useNavigate();
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
	// An existing email just signs in here; /onboarding sends them on to `redirect` if they have a plan.
	if (step === "passkey") {
		return <PasskeyStep onDone={() => navigate({ to: "/onboarding", search: { redirect } })} />;
	}
	return (
		<>
			<InviteLine redirect={redirect} action="Crea tu cuenta" />
			<DetailsStep
				defaultValues={details}
				onSent={(sent) => {
					setDetails(sent);
					setStep("otp");
				}}
			/>
		</>
	);
}
