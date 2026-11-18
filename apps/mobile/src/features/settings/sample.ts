import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import type { Cycle } from "@/features/cycle/cycle-days";

type Profile = NonNullable<FunctionReturnType<typeof api.profiles.myProfile>>;
type Household = NonNullable<FunctionReturnType<typeof api.household.get>>;

export const SAMPLE_CYCLE: Cycle = { cadence: "monthly", cycleStartDay: 15 };

export const SAMPLE_PROFILE: Profile = {
	name: "Edzon",
	plan: SAMPLE_CYCLE,
	nextPlan: null,
	hasHousehold: true,
	hasPlus: false,
	plusHistory: "none",
	trialEndsAt: null,
	welcomeSeen: false,
	trialEndedSeen: false,
	trialReminderSeen: false,
	deletionRunsAt: null,
};

export const SAMPLE_EMAIL = "edzon@correo.pe";

export const SAMPLE_HOUSEHOLD: Household = {
	name: null,
	isOwner: true,
	partnerName: null,
	partnerJoinedAt: null,
	cycle: SAMPLE_CYCLE,
	partnerLeft: null,
	withdrawalNotice: null,
	invite: { code: "K7P4QM", expiresAt: Date.UTC(2026, 10, 20, 15) },
	plus: { active: false, payerName: null, payerIsMe: false },
};

export type Device = { id: string; name: string; detail: string };

export const SAMPLE_PASSKEYS: Device[] = [
	{ id: "passkey_phone", name: "Este celular", detail: "Pixel 8 · activada el 24 oct" },
	{ id: "passkey_chrome", name: "Chrome · Windows", detail: "Usada hace 3 días" },
];

export const SAMPLE_SESSIONS: Device[] = [
	{ id: "session_phone", name: "Este celular", detail: "Lima · ahora" },
	{ id: "session_chrome", name: "Chrome · Windows", detail: "Lima · hace 3 días" },
];
