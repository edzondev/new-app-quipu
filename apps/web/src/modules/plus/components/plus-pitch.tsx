import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { type PlusHistory, TRIAL_MS } from "@quipu/backend/shared/billing";
import { useMutation } from "@tanstack/react-query";
import { CalendarCheck, ShieldCheck, Target, Users } from "lucide-react";
import { type ComponentProps, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "#/components/ui/alert";
import { Button } from "#/components/ui/button";
import { toastManager } from "#/components/ui/toast";
import { formatShortDate } from "#/lib/format-short-date";
import {
	PLUS_CARD_BUTTON as BIG,
	PlusCard,
	PlusCardHeading,
	type PlusRow,
	PlusRows,
} from "./plus-card";
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

// After the trial or a lapsed Plus, the same card says it ended instead of offering the trial.
const ENDED: Record<Exclude<PlusHistory, "none">, string> = {
	trial: "Tu prueba de Plus terminó. Suscríbete para seguir usando esta función.",
	paid: "Tu Quipu Plus terminó. Suscríbete para seguir usando esta función.",
};

/** T1: a Plus feature was asked for. Offers the trial once; after that, only the plans. */
export function PlusPitch({
	feature,
	plusHistory,
	onPlans,
	onDismiss,
	onTrialStarted,
	finalFocus,
}: {
	feature: PlusFeature;
	plusHistory: PlusHistory;
	onPlans: () => void;
	onDismiss: () => void;
	onTrialStarted: () => void;
	finalFocus: ComponentProps<typeof PlusCard>["finalFocus"];
}) {
	const { title, description, rows } = PITCH[feature];
	const trialAvailable = plusHistory === "none";
	const titleRef = useRef<HTMLHeadingElement>(null);
	return (
		<PlusCard initialFocus={titleRef} finalFocus={finalFocus}>
			<PlusCardHeading
				pill="Plus"
				title={title}
				description={plusHistory === "none" ? description : ENDED[plusHistory]}
				titleRef={titleRef}
			/>
			<PlusRows rows={rows} />
			<div className="mt-6 grid gap-2.5">
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
			</div>
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
			toastManager.add({
				title: "Prueba de Plus activa.",
				description: `Termina el ${formatShortDate(result.trialEndsAt)}.`,
				type: "success",
			});
			onStarted();
		},
		onError: () => {
			started.current = false;
		},
	});
	const activating = trial.isPending || trial.isSuccess;
	// T1 mounts each time it opens, so this is when the person is looking at it.
	const [openedAt] = useState(() => Date.now());

	return (
		<>
			{/* The end the server would set if the trial started now; the toast then shows the real one. */}
			<Alert role="note" className="mb-1.5 border-border/72 bg-muted [&>svg]:text-envelope-savings">
				<CalendarCheck aria-hidden />
				<AlertTitle className="font-semibold">
					Gratis hasta el {formatShortDate(openedAt + TRIAL_MS)}.
				</AlertTitle>
				<AlertDescription>
					No pedimos tarjeta y no se te cobra nada. Ese día vuelves a Gratis.
				</AlertDescription>
			</Alert>
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
				{activating ? "Activando…" : "Empezar prueba gratis"}
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
