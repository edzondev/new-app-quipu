import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { toCents } from "@quipu/backend/shared/budget";
import { getLimaDate } from "@quipu/backend/shared/dates";
import { safeRedirect } from "@quipu/backend/shared/household";
import {
	cycleStepSchema,
	nameStepSchema,
	splitStepSchema,
} from "@quipu/backend/shared/onboarding-schemas";
import { parseStartDay } from "@quipu/backend/shared/plan";
import { revalidateLogic } from "@tanstack/react-form";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { QuipuHeader } from "#/components/quipu-header";
import { useAppForm } from "#/hooks/use-app-form";
import { CycleStep } from "#/modules/onboarding/components/cycle-step";
import { NameStep } from "#/modules/onboarding/components/name-step";
import { SplitStep } from "#/modules/onboarding/components/split-step";
import { emptyValues } from "#/modules/onboarding/default-values";

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

const validationLogic = revalidateLogic();

function OnboardingPage() {
	const { redirect = "/home" } = Route.useSearch();
	const { profileName } = Route.useRouteContext();
	const navigate = useNavigate();
	const completeOnboarding = useConvexMutation(api.profiles.completeOnboarding);
	const [step, setStep] = useState<Step>("name");
	const [saveError, setSaveError] = useState<string | null>(null);
	const [today] = useState(() => getLimaDate());
	const stepNumber = STEPS.indexOf(step) + 1;

	const form = useAppForm({
		defaultValues: { ...emptyValues, nameStep: { name: profileName } },
		onSubmit: async ({ value: { nameStep, cycleStep, splitStep } }) => {
			setSaveError(null);
			try {
				await completeOnboarding({
					name: nameStep.name,
					cadence: cycleStep.cadence,
					cycleStartDay: parseStartDay(cycleStep.startDay),
					// Left empty, the usual income is omitted from the plan instead of saved as 0.
					incomeCents: toCents(cycleStep.cycleIncome) || undefined,
					todayCents: toCents(cycleStep.todayAmount),
					split: splitStep.split,
				});
				await navigate({ to: redirect, replace: true });
			} catch (error) {
				setSaveError(
					error instanceof ConvexError
						? String(error.data)
						: "No pudimos guardar. Inténtalo otra vez.",
				);
			}
		},
	});

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
					<form.FormGroup
						name="nameStep"
						validationLogic={validationLogic}
						validators={{ onDynamic: nameStepSchema }}
						onGroupSubmit={() => {
							form.setFieldValue("nameStep.name", (name) => name.trim());
							setStep("cycle");
						}}
					>
						{(group) => <NameStep form={form} onSubmit={() => void group.handleSubmit()} />}
					</form.FormGroup>
				)}
				{step === "cycle" && (
					<form.FormGroup
						name="cycleStep"
						validationLogic={validationLogic}
						validators={{ onDynamic: cycleStepSchema }}
						onGroupSubmit={() => setStep("split")}
					>
						{(group) => (
							<CycleStep
								form={form}
								today={today}
								onBack={() => setStep("name")}
								onSubmit={() => void group.handleSubmit()}
							/>
						)}
					</form.FormGroup>
				)}
				{step === "split" && (
					// form.handleSubmit doesn't run group validators: the group passes first.
					<form.FormGroup
						name="splitStep"
						validationLogic={validationLogic}
						validators={{ onDynamic: splitStepSchema }}
						onGroupSubmit={() => form.handleSubmit()}
					>
						{(group) => (
							<SplitStep
								form={form}
								saveError={saveError}
								onBack={() => setStep("cycle")}
								onSubmit={() => void group.handleSubmit()}
							/>
						)}
					</form.FormGroup>
				)}
			</main>
		</div>
	);
}
