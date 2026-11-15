import { MAX_MOVEMENT_CENTS, NOTE_MAX_LENGTH } from "@quipu/backend/shared/budget";

export type DetectedKind = "expense" | "income";

export type DetectedDraft = {
	kind: DetectedKind;
	cents: number;
	merchant: string;
	bank: string;
};

type Param = string | string[] | undefined;

function first(value: Param): string {
	const raw = Array.isArray(value) ? value[0] : value;
	return raw?.trim() ?? "";
}

/** Deep link params are untrusted: anyone can build quipu://register. */
export function parseDetected(params: {
	kind?: Param;
	cents?: Param;
	merchant?: Param;
	bank?: Param;
}): DetectedDraft | null {
	const kind = first(params.kind);
	if (kind !== "expense" && kind !== "income") return null;
	const cents = Number(first(params.cents));
	if (!Number.isSafeInteger(cents) || cents <= 0 || cents > MAX_MOVEMENT_CENTS) return null;
	return {
		kind,
		cents,
		merchant: first(params.merchant).slice(0, NOTE_MAX_LENGTH),
		bank: first(params.bank).slice(0, 80),
	};
}
