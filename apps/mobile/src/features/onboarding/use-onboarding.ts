import { api } from "@quipu/backend/convex/_generated/api";
import { splitIncome, toCents } from "@quipu/backend/shared/budget";
import { getLimaDate } from "@quipu/backend/shared/dates";
import {
	cycleStepSchema,
	nameStepSchema,
	splitStepSchema,
	todayStepSchema,
} from "@quipu/backend/shared/onboarding-schemas";
import {
	DEFAULT_START_DAY,
	type Frequency,
	getCyclePlan,
	isFrequency,
} from "@quipu/backend/shared/start-day";
import { useConvexMutation } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { readError } from "@/lib/read-error";
import { DEFAULT_SPLIT } from "./onboarding-plan";

type Step = 1 | 2 | 3 | 4;

export function useOnboarding(profileName: string) {
	const complete = useMutation({ mutationFn: useConvexMutation(api.profiles.completeOnboarding) });
	const [step, setStep] = useState<Step>(1);
	const [name, setName] = useState(profileName);
	const [nameError, setNameError] = useState<string | null>(null);
	const [frequency, setFrequency] = useState<Frequency | "">("");
	const [startDay, setStartDay] = useState("1");
	const [incomeText, setIncomeText] = useState("");
	const [incomeError, setIncomeError] = useState<string | null>(null);
	const [todayText, setTodayText] = useState("");
	const [todayError, setTodayError] = useState<string | null>(null);
	const [split, setSplit] = useState(DEFAULT_SPLIT);
	const [splitError, setSplitError] = useState<string | null>(null);
	const saving = complete.isPending;
	const saveError = complete.error
		? readError(complete.error, "No pudimos guardar. Inténtalo otra vez.")
		: null;

	// The day is read on every render: with the app in the background it can change.
	const plan = isFrequency(frequency) ? getCyclePlan(frequency, startDay, getLimaDate()) : null;

	function next() {
		if (step === 1) {
			const parsed = nameStepSchema.safeParse({ name });
			setNameError(parsed.success ? null : parsed.error.issues[0].message);
			if (parsed.success) setStep(2);
		} else if (step === 2) {
			const parsed = cycleStepSchema.safeParse({ frequency, startDay, cycleIncome: incomeText });
			const incomeIssue = parsed.success
				? undefined
				: parsed.error.issues.find((issue) => issue.path[0] === "cycleIncome");
			setIncomeError(incomeIssue?.message ?? null);
			if (parsed.success) setStep(3);
		} else if (step === 3) {
			const parsed = todayStepSchema.safeParse({ todayAmount: todayText });
			setTodayError(parsed.success ? null : parsed.error.issues[0].message);
			if (parsed.success) setStep(4);
		}
	}

	function finish() {
		if (saving) return;
		const parsed = splitStepSchema.safeParse({ split });
		setSplitError(parsed.success ? null : parsed.error.issues[0].message);
		// The cycle step does not let an unpicked frequency through; `plan` narrows the type.
		if (!parsed.success || !plan) return;
		complete.mutate({
			name,
			cadence: plan.cadence,
			cycleStartDay: plan.cycleStartDay,
			incomeCents: toCents(incomeText) || undefined,
			todayCents: toCents(todayText),
			split,
		});
	}

	return {
		step,
		next,
		back: () => {
			complete.reset();
			setStep((current) => (current === 4 ? 3 : current === 3 ? 2 : 1));
		},
		finish,
		saving,
		name,
		nameError,
		setName: (text: string) => {
			setName(text);
			setNameError(null);
		},
		plan,
		frequency,
		setFrequency: (picked: Frequency) => {
			setFrequency(picked);
			setStartDay(DEFAULT_START_DAY[picked]);
			// The income field is hidden without a fixed pay: nothing typed there may block the step.
			if (picked === "variable") {
				setIncomeText("");
				setIncomeError(null);
			}
		},
		setStartDay,
		incomeText,
		incomeError,
		setIncomeText: (text: string) => {
			setIncomeText(text);
			setIncomeError(null);
		},
		todayText,
		todayError,
		setTodayText: (text: string) => {
			setTodayText(text);
			setTodayError(null);
		},
		split,
		setSplit: (picked: typeof split) => {
			setSplit(picked);
			setSplitError(null);
		},
		splitError,
		saveError,
		envelopes: splitIncome(toCents(todayText), split),
	};
}
