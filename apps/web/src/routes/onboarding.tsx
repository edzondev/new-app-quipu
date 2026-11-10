import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { safeRedirect } from "@quipu/backend/shared/household";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { cn } from "cn";
import { useState } from "react";
import { QuipuHeader } from "#/components/quipu-header";
import { NameStep } from "#/modules/onboarding/components/name-step";
import { CycleStep } from "#/modules/onboarding/components/cycle-step";
import { SplitStep } from "#/modules/onboarding/components/split-step";
import type { OnboardingValues } from "#/modules/onboarding/schemas";

export const Route = createFileRoute("/onboarding")({
	validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
		redirect: safeRedirect(search.redirect),
	}),
	beforeLoad: async ({ context, search }) => {
		if (!context.isAuthenticated) throw redirect({ to: "/sign-in" });
		const profile = await context.queryClient.query(convexQuery(api.profiles.myProfile, {}));
		if (profile?.plan) throw redirect({ to: search.redirect ?? "/home" });
		// An account made before the name moved here already has one.
		return { profileName: profile?.name ?? "" };
	},
	head: () => ({
		meta: [
			{ title: "Quipu — Primeros pasos" },
			{
				name: "description",
				content: "Tu ingreso y tus sobres, en tres pasos.",
			},
		],
	}),
	component: OnboardingPage,
});

const STEPS = ["name", "cycle", "split"] as const;
type Step = (typeof STEPS)[number];

const emptyValues: OnboardingValues = {
	nameStep: { name: "" },
	cycleStep: { cadence: "monthly", startDay: "1", todayAmount: "", cycleIncome: "" },
	splitStep: { split: { needs: 50, wants: 30, savings: 20 } },
};

function OnboardingPage() {
	const { redirect = "/home" } = Route.useSearch();
	const { profileName } = Route.useRouteContext();
	const [step, setStep] = useState<Step>("name");
	const [values, setValues] = useState({ ...emptyValues, nameStep: { name: profileName } });
	const [today] = useState(() => getLimaDate());
	const stepNumber = STEPS.indexOf(step) + 1;

	function goTo(next: Step, patch: Partial<OnboardingValues>) {
		setValues((current) => ({ ...current, ...patch }));
		setStep(next);
	}

	return (
		<div className="min-h-svh bg-background text-foreground">
			<QuipuHeader />

			<main className="mx-auto w-full max-w-170 px-7 pb-16 pt-6 sm:pt-12">
				<div className="flex items-center gap-4">
					<div
						role="progressbar"
						aria-label="Primeros pasos"
						aria-valuemin={1}
						aria-valuemax={STEPS.length}
						aria-valuenow={stepNumber}
						className="flex flex-1 gap-1.5"
					>
						{STEPS.map((s, i) => (
							<span
								key={s}
								className={cn(
									"h-1 flex-1 rounded-full",
									i < stepNumber ? "bg-foreground" : "bg-muted",
								)}
							/>
						))}
					</div>
					<span className="text-xs tabular-nums text-muted-foreground">
						{stepNumber} de {STEPS.length}
					</span>
				</div>

				{step === "name" && (
					<NameStep
						defaultValues={values.nameStep}
						onNext={(nameStep) => goTo("cycle", { nameStep })}
					/>
				)}
				{step === "cycle" && (
					<CycleStep
						defaultValues={values.cycleStep}
						today={today}
						onBack={(cycleStep) => goTo("name", { cycleStep })}
						onNext={(cycleStep) => goTo("split", { cycleStep })}
					/>
				)}
				{step === "split" && (
					<SplitStep
						defaultValues={values.splitStep}
						name={values.nameStep.name}
						cycleStep={values.cycleStep}
						redirect={redirect}
						onBack={(splitStep) => goTo("cycle", { splitStep })}
					/>
				)}
			</main>
		</div>
	);
}
