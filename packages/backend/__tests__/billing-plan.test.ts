import { expect, test } from "vitest";
import { isOwnPurchase, type PlusStatus, planCard, planRowLine } from "../shared/billing";

const TODAY = "2026-11-11";
const at = (iso: string) => Date.parse(iso);
// 03:00Z is still the evening before in Lima.
const LIMA_19_NOV = at("2026-11-20T03:00:00Z");
const PORTAL = "Administrar suscripción";
const PLANS = "plans";
const GONE = "Tu Plus terminó. Lo de Plus queda en solo lectura; tus datos no se borran.";
const NEXT_YEAR = at("2027-11-10T15:00:00Z");

type Paid = Extract<PlusStatus, { kind: "paid" }>;
const paid = (over: Partial<Paid> = {}): PlusStatus => ({
	kind: "paid",
	interval: "year",
	amountCents: 8990,
	renewsAt: NEXT_YEAR,
	...over,
});

const cases: [PlusStatus, string, string, unknown][] = [
	[{ kind: "free" }, "Gratis", "Sin límite de tiempo.", { label: "Ver Plus", to: PLANS }],
	[
		{ kind: "trial", endsAt: LIMA_19_NOV },
		"En prueba · quedan 8 días",
		"Termina el 19 nov. No te cobramos nada.",
		{ label: "Ver planes", to: PLANS },
	],
	[
		{ kind: "trial", endsAt: at("2026-11-12T20:00:00Z") },
		"En prueba · queda 1 día",
		"Termina el 12 nov. No te cobramos nada.",
		{ label: "Ver planes", to: PLANS },
	],
	[
		{ kind: "trial", endsAt: at("2026-11-12T03:00:00Z") },
		"En prueba · termina hoy",
		"Termina el 11 nov. No te cobramos nada.",
		{ label: "Ver planes", to: PLANS },
	],
	[
		{ kind: "trialEnded" },
		"Tu prueba de Plus terminó",
		"Volviste al plan Gratis. No se borró nada.",
		{ label: "Suscribirme", to: PLANS },
	],
	[
		paid(),
		"Plus anual",
		"S/ 89.90 al año · Renueva el 10 nov 2027.",
		{ label: PORTAL, to: "portal" },
	],
	[
		paid({ interval: "month", amountCents: 1290, renewsAt: at("2026-12-01T15:00:00Z") }),
		"Plus mensual",
		"S/ 12.90 al mes · Renueva el 1 dic.",
		{ label: PORTAL, to: "portal" },
	],
	[
		{ kind: "ending", interval: "year", endsAt: LIMA_19_NOV },
		"Plus anual",
		"Se cancela el 19 nov. Sigues con Plus hasta entonces.",
		{ label: PORTAL, to: "portal" },
	],
	[
		{ kind: "pastDue", interval: "month" },
		"Plus mensual",
		"No pudimos cobrar tu pago. Actualiza tu tarjeta para seguir con Plus.",
		{ label: "Actualizar pago", to: "portal" },
	],
	[
		{ kind: "household", payerName: "Renzo", payerOnTrial: false },
		"Plus del hogar",
		"Renzo paga Quipu Plus. Tú entras gratis.",
		null,
	],
	[
		{ kind: "household", payerName: "Camila", payerOnTrial: true },
		"Plus del hogar",
		"Camila tiene Quipu Plus. Tú entras gratis.",
		null,
	],
	[{ kind: "lapsed", payerIsMe: true }, "Gratis", GONE, { label: "Renovar Plus", to: PLANS }],
	[{ kind: "lapsed", payerIsMe: false }, "Gratis", GONE, { label: "Pagar yo", to: PLANS }],
];

test.each(cases)("%j: one title, one line, at most one action", (status, title, line, action) => {
	expect(planCard(status, TODAY)).toEqual({ title, line, action });
});

test("what is missing is left out, never shown as a dash", () => {
	expect(planCard(paid({ interval: null }), TODAY)).toMatchObject({
		title: "Quipu Plus",
		line: "Renueva el 10 nov 2027.",
	});
	expect(planCard(paid({ amountCents: null }), TODAY).line).toBe("Renueva el 10 nov 2027.");
	expect(planCard(paid({ renewsAt: null }), TODAY).line).toBe("S/ 89.90 al año.");
	expect(planCard(paid({ amountCents: null, renewsAt: null }), TODAY).line).toBe("");
	expect(planCard({ kind: "ending", interval: null, endsAt: null }, TODAY)).toMatchObject({
		title: "Quipu Plus",
		line: "Se cancela al terminar el periodo. Sigues con Plus hasta entonces.",
	});
});

test("the Ajustes row says Activo for a paid plan and the card title for the rest", () => {
	expect(planRowLine(paid(), TODAY)).toBe("Activo · se renueva el 10 nov 2027");
	expect(planRowLine(paid({ renewsAt: null }), TODAY)).toBe("Activo");
	expect(planRowLine({ kind: "trial", endsAt: LIMA_19_NOV }, TODAY)).toBe(
		"En prueba · quedan 8 días",
	);
	expect(planRowLine({ kind: "free" }, TODAY)).toBe("Gratis");
	expect(planRowLine({ kind: "pastDue", interval: "year" }, TODAY)).toBe("Plus anual");
});

test("only a subscription of one's own confirms a purchase", () => {
	const own: PlusStatus[] = [
		paid(),
		{ kind: "ending", interval: null, endsAt: null },
		{ kind: "pastDue", interval: null },
	];
	const other: PlusStatus[] = [
		{ kind: "trial", endsAt: LIMA_19_NOV },
		{ kind: "trialEnded" },
		{ kind: "household", payerName: "Renzo", payerOnTrial: false },
		{ kind: "lapsed", payerIsMe: true },
		{ kind: "free" },
	];
	expect(own.map(isOwnPurchase)).toEqual([true, true, true]);
	expect(other.map(isOwnPurchase)).toEqual([false, false, false, false, false]);
});
