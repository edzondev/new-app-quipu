import type { api } from "@quipu/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

type Offers = FunctionReturnType<typeof api.billing.offer>;

/** 24 nov, Lima. */
export const SAMPLE_TRIAL_ENDS_AT = Date.UTC(2026, 10, 24, 15);

export const SAMPLE_OFFERS: Offers = [
	{
		productId: "sample_year",
		interval: "year",
		prices: [{ currency: "pen", amountCents: 8_990 }],
	},
	{
		productId: "sample_month",
		interval: "month",
		prices: [{ currency: "pen", amountCents: 1_290 }],
	},
];

/**
 * Every plan Tu plan can show, to look at each one: `/plan?status=trial`. Without the parameter
 * it is «free». Se borra al conectar Convex: ahí manda `billing.status`.
 */
const SAMPLE_STATUSES = {
	free: { kind: "free" },
	trial: { kind: "trial", endsAt: SAMPLE_TRIAL_ENDS_AT },
	gift: { kind: "gift", endsAt: Date.UTC(2027, 1, 13, 15) },
	trialEnded: { kind: "trialEnded" },
	paid: {
		kind: "paid",
		interval: "year",
		amountCents: 8_990,
		renewsAt: Date.UTC(2027, 10, 10, 15),
	},
	ending: { kind: "ending", interval: "year", endsAt: Date.UTC(2026, 11, 10, 15) },
	pastDue: { kind: "pastDue", interval: "year" },
	household: { kind: "household", payerName: "Ana", payerOnTrial: false },
	lapsed: { kind: "lapsed", payerIsMe: true },
	lapsedPartner: { kind: "lapsed", payerIsMe: false },
} satisfies Record<string, NonNullable<FunctionReturnType<typeof api.billing.status>>>;

type SampleStatusKey = keyof typeof SAMPLE_STATUSES;

function isStatusKey(key: string | undefined): key is SampleStatusKey {
	return key !== undefined && Object.keys(SAMPLE_STATUSES).includes(key);
}

export function sampleStatus(key: string | undefined) {
	return isStatusKey(key) ? SAMPLE_STATUSES[key] : SAMPLE_STATUSES.free;
}
