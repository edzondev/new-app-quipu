import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation } from "@tanstack/react-query";
import { ShieldCheck, Target, Users } from "lucide-react";
import { type ComponentProps, useRef } from "react";
import { Button } from "#/components/ui/button";
import { toastManager } from "#/components/ui/toast";
import { PLUS_CARD_BUTTON as BIG, PlusCard, type PlusRow } from "./plus-card";
import type { PlusFeature } from "./plus-features";

const PITCH: Record<PlusFeature, { title: string; description: string; rows: PlusRow[] }> = {
	household: {
		title: "Nuestro espacio es de Plus",
		description: "Lleven los gastos de casa en un espacio para dos.",
		rows: [
			{
				Icon: Users,
				name: "Invita a tu pareja.",
				detail: "Si te suscribes, solo tú pagas. Tu pareja entra gratis.",
			},
			{
				Icon: ShieldCheck,
				name: "Lo personal sigue privado.",
				detail: "Comparten solo lo de Nuestro espacio.",
			},
		],
	},
	goals: {
		title: "Más de 2 metas es de Plus",
		description: "Añade otra meta de ahorro con Quipu Plus.",
		rows: [
			{
				Icon: Target,
				name: "Más espacio para tus metas.",
				detail: "El fondo de emergencia no cuenta.",
			},
		],
	},
};

/** T1: a Plus feature was asked for. Offers the trial once; after that, only the plans. */
export function PlusPitch({
	feature,
	trialAvailable,
	onPlans,
	onDismiss,
	onTrialStarted,
	finalFocus,
}: {
	feature: PlusFeature;
	trialAvailable: boolean;
	onPlans: () => void;
	onDismiss: () => void;
	onTrialStarted: () => void;
	finalFocus: ComponentProps<typeof PlusCard>["finalFocus"];
}) {
	return (
		<PlusCard
			pill="Plus"
			{...PITCH[feature]}
			foot={trialAvailable ? "Sin tarjeta. Al terminar vuelves a Gratis." : undefined}
			finalFocus={finalFocus}
		>
			{trialAvailable ? (
				<TrialActions onPlans={onPlans} onStarted={onTrialStarted} />
			) : (
				<>
					<Button size="xl" className={BIG} onClick={onPlans}>
						Suscribirme
					</Button>
					<Button size="xl" variant="outline" className={BIG} onClick={onDismiss}>
						Ahora no
					</Button>
				</>
			)}
		</PlusCard>
	);
}

function TrialActions({ onPlans, onStarted }: { onPlans: () => void; onStarted: () => void }) {
	const startTrial = useConvexMutation(api.profiles.startTrial);
	// `isPending` renders a tick late, so two quick clicks would both get through without this.
	const started = useRef(false);
	const trial = useMutation({
		mutationFn: () => startTrial({}),
		// "used" needs nothing here: myProfile follows and this card turns into T1-usada.
		onSuccess: (result) => {
			if (result.status !== "active") return;
			const end = formatDay(getLimaDate(new Date(result.trialEndsAt)));
			toastManager.add({
				title: "Prueba de Plus activa.",
				description: `Termina el ${end}.`,
				type: "success",
			});
			onStarted();
		},
		onError: () => {
			started.current = false;
		},
	});
	const activating = trial.isPending || trial.isSuccess;

	return (
		<>
			<Button
				size="xl"
				className={BIG}
				disabled={activating}
				onClick={() => {
					if (started.current) return;
					started.current = true;
					trial.mutate();
				}}
			>
				{activating ? "Activando…" : "Probar 14 días gratis"}
			</Button>
			{trial.isError ? (
				<p role="alert" className="text-center text-xs text-warning-foreground">
					No pudimos activar la prueba. Intenta de nuevo.
				</p>
			) : null}
			<Button size="xl" variant="outline" className={BIG} onClick={onPlans}>
				Ver planes
			</Button>
		</>
	);
}
