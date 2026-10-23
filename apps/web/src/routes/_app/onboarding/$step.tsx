import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/onboarding/$step")({
	component: OnboardingStep,
});

function OnboardingStep() {
	const { step } = Route.useParams();
	return (
		<main>
			<p>Seguimos donde te quedaste.</p>
			<p>{step}</p>
		</main>
	);
}
