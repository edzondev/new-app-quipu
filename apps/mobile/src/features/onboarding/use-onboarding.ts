import { toCents } from "@quipu/backend/shared/budget";
import { getFirstCycleRange } from "@quipu/backend/shared/dates";
import { type Cadence, type CycleStartDay, isValidSplit } from "@quipu/backend/shared/plan";
import { useState } from "react";
import { SAMPLE_TODAY } from "@/features/home/sample";
import { DEFAULT_SPLIT, type FixedItem, firstNumber } from "./plan";

type Step = 1 | 2 | 3;

let nextItemId = 0;

/** The three steps of Primeros pasos. `warn` says what a step needs before moving on (amber). */
export function useOnboarding(warn: (text: string) => void) {
	const [step, setStep] = useState<Step>(1);
	const [todayText, setTodayText] = useState("");
	const [todayMissing, setTodayMissing] = useState(false);
	const [cadence, setCadence] = useState<Cadence>("monthly");
	const [startDay, setStartDay] = useState<CycleStartDay>(1);
	const [incomeText, setIncomeText] = useState("");
	const [split, setSplit] = useState(DEFAULT_SPLIT);
	const [items, setItems] = useState<FixedItem[]>([]);

	const todayCents = toCents(todayText);
	const range = getFirstCycleRange(cadence, startDay, SAMPLE_TODAY);
	const number = firstNumber({ todayCents, split, range, items });

	function next() {
		if (step === 1) {
			if (todayCents === 0) setTodayMissing(true);
			else setStep(2);
		} else if (step === 2) {
			if (isValidSplit(split)) setStep(3);
			else warn("Los tres sobres tienen que sumar 100%.");
		}
	}

	return {
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
