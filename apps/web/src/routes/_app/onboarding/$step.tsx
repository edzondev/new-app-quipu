import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/onboarding/$step")({
	component: OnboardingStep,
});

function OnboardingStep() {
	const { step } = Route.useParams();
	const { profile } = Route.useRouteContext();
	return (
		<main>
			<p>Seguimos donde te quedaste.</p>
			<p>{step}</p>
			{profile?.draftSalaryCents !== undefined ? <p>{profile.draftSalaryCents}</p> : null}
			{profile?.draftPayday !== undefined ? <p>{profile.draftPayday}</p> : null}
		</main>
	);
}
