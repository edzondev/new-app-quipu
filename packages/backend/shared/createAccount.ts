import { type Draft, createAccountDraftSchema, timestampMs } from "./validation";

export type { Draft, Phase } from "./validation";

export const emptyDraft: Draft = {
	name: "",
	email: "",
	phase: "details",
	waitUntil: null,
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function readDraft(text: string | null, now: number): Draft {
	if (!text) return emptyDraft;
	try {
		const saved: unknown = JSON.parse(text);
		const parsed = createAccountDraftSchema(now).safeParse(saved);
		if (!parsed.success) return emptyDraft;
		return parsed.data;
	} catch {
		return emptyDraft;
	}
}

export function accountAlreadyExisted(createdAt: unknown, serverNow: unknown) {
	const created = timestampMs.safeParse(createdAt);
	const now = timestampMs.safeParse(serverNow);
	if (!created.success || !now.success) return false;
	return now.data - created.data > TWO_HOURS_MS;
}
