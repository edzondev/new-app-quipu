import { api } from "@quipu/backend/convex/_generated/api";
import { toCents } from "@quipu/backend/shared/budget";
import { getFirstCycleRange, getLimaDate } from "@quipu/backend/shared/dates";
import { nameSchema } from "@quipu/backend/shared/name";
import { type Cadence, type CycleStartDay, isValidSplit } from "@quipu/backend/shared/plan";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { DEFAULT_SPLIT, type FixedItem, firstCyclePreview } from "./onboarding-plan";

type Step = 1 | 2 | 3;

let nextItemId = 0;

export function useOnboarding(warn: (text: string) => void, profileName: string) {
	const completeOnboarding = useMutation(api.profiles.completeOnboarding);
	const [saving, setSaving] = useState(false);
	const [name, setName] = useState(profileName);
	const [nameError, setNameError] = useState<string | null>(null);
	const [step, setStep] = useState<Step>(1);
	const [todayText, setTodayText] = useState("");
	const [todayMissing, setTodayMissing] = useState(false);
	const [cadence, setCadence] = useState<Cadence>("monthly");
	const [startDay, setStartDay] = useState<CycleStartDay>(1);
	const [incomeText, setIncomeText] = useState("");
	const [split, setSplit] = useState(DEFAULT_SPLIT);
	const [items, setItems] = useState<FixedItem[]>([]);

	const todayCents = toCents(todayText);
	const range = getFirstCycleRange(cadence, startDay, getLimaDate());
	const number = firstCyclePreview({ todayCents, split, range, items });

	function next() {
		if (step === 1) {
			const parsedName = nameSchema.safeParse(name);
			setNameError(parsedName.success ? null : parsedName.error.issues[0].message);
			if (todayCents === 0) setTodayMissing(true);
			if (parsedName.success && todayCents > 0) setStep(2);
		} else if (step === 2) {
			if (isValidSplit(split)) setStep(3);
			else warn("Los tres sobres tienen que sumar 100%.");
		}
	}

	async function finish() {
		if (saving) return;
		setSaving(true);
		// Luego: guardar los fijos (items) con api.commitments.add en el PR de Compromisos.
		try {
			await completeOnboarding({
				name,
				cadence,
				cycleStartDay: startDay,
				incomeCents: toCents(incomeText) || undefined,
				todayCents,
				split,
			});
		} catch (error) {
			warn(
				error instanceof ConvexError
					? String(error.data)
					: "No pudimos guardar. Inténtalo otra vez.",
			);
		} finally {
			setSaving(false);
		}
	}

	return {
		saving,
		finish,
		name,
		nameError,
		setName: (text: string) => {
			setName(text);
			setNameError(null);
		},
		step,
		back: () => setStep((current) => (current === 3 ? 2 : 1)),
		next,
		todayText,
		todayMissing,
		setTodayText: (text: string) => {
			setTodayText(text);
			setTodayMissing(false);
		},
		cadence,
		setCadence: (picked: Cadence) => {
			setCadence(picked);
			setStartDay(1);
		},
		startDay,
		setStartDay,
		incomeText,
		setIncomeText,
		split,
		setSplit,
		items,
		addItem: (name: string) =>
			setItems((rows) => [
				...rows,
				{ id: String(nextItemId++), name, dayText: "1", amountText: "" },
			]),
		updateItem: (id: string, patch: Partial<Omit<FixedItem, "id">>) =>
			setItems((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row))),
		removeItem: (id: string) => setItems((rows) => rows.filter((row) => row.id !== id)),
		todayCents,
		range,
		number,
	};
}
