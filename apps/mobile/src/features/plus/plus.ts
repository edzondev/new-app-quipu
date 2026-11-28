import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { SAMPLE_PROFILE } from "@/features/settings/sample";
import { SAMPLE_OFFERS, SAMPLE_TRIAL_ENDS_AT } from "./sample";

export type PlusFeature = "space" | "banks" | "goals" | "report";

export const FREE_BANKS = 2;

export const PLUS_ROWS: { id: PlusFeature; title: string; detail: string | null }[] = [
	{ id: "space", title: "Nuestro espacio", detail: "Tu pareja entra gratis." },
	{ id: "banks", title: "Más de 2 bancos", detail: "Solo en Android." },
	{ id: "goals", title: "Más de 2 metas", detail: "El fondo no cuenta." },
	{ id: "report", title: "Informe completo de Progreso con PDF y Excel", detail: null },
];

export const FEATURE_OFFERS: Record<
	PlusFeature,
	{ title: string; subtitle: string; points: { title: string; detail: string }[] }
> = {
	space: {
		title: "Nuestro espacio es de Plus",
		subtitle: "Lleven los gastos de casa en un espacio para dos.",
		points: [
			{
				title: "Invita a tu pareja.",
				detail: "Si te suscribes, solo tú pagas. Tu pareja entra gratis.",
			},
			{
				title: "Lo personal sigue privado.",
				detail: "Comparten solo lo de Nuestro espacio.",
			},
		],
	},
	goals: {
		title: "Más de 2 metas es de Plus",
		subtitle: "Añade otra meta de ahorro con Quipu Plus.",
		points: [{ title: "Más espacio para tus metas.", detail: "El fondo de emergencia no cuenta." }],
	},
	banks: {
		title: "Más de 2 bancos es de Plus",
		subtitle: "Añade otro banco en la app de Android.",
		points: [{ title: "Más de 2 bancos.", detail: "Solo en Android." }],
	},
	report: {
		title: "Progreso completo es de Plus",
		subtitle: "Compara tus ciclos y mira qué cambió.",
		points: [{ title: "Compara tus ciclos.", detail: "Revisa tu progreso entre un ciclo y otro." }],
	},
};

export function trialStartedText(endsAt: number) {
	return `Prueba de Plus activa. Termina el ${formatDay(getLimaDate(new Date(endsAt)))}.`;
}

export function usePlus() {
	return {
		offers: SAMPLE_OFFERS,
		hasPlus: SAMPLE_PROFILE.hasPlus,
		trialAvailable: SAMPLE_PROFILE.plusHistory === "none",
		startTrial: () => SAMPLE_TRIAL_ENDS_AT,
	};
}
