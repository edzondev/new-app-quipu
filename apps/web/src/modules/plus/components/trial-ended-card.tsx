import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, Users } from "lucide-react";
import { type ComponentProps, useRef } from "react";
import { Button } from "#/components/ui/button";
import { PLUS_CARD_BUTTON as BIG, PlusCard, PlusCardHeading, PlusRows } from "./plus-card";

const KEPT = {
	Icon: ShieldCheck,
	name: "Lo que creaste sigue ahí.",
	detail: "Solo lo nuevo de Plus necesita suscripción.",
};

const HOUSEHOLD_READ_ONLY = {
	Icon: Users,
	name: "Nuestro espacio queda en solo lectura.",
	detail: "Pueden verlo, pero no anotar.",
};

/** V1: the trial ended and nobody pays. Nothing was deleted. */
export function TrialEndedCard({
	hasHousehold,
	finalFocus,
	onClose,
}: {
	hasHousehold: boolean;
	finalFocus: ComponentProps<typeof PlusCard>["finalFocus"];
	onClose: (toPlans: boolean) => void;
}) {
	const titleRef = useRef<HTMLHeadingElement>(null);
	const household = useQuery(convexQuery(api.household.get, hasHousehold ? {} : "skip"));
	// If the partner pays, the household is still open and the row would not be true.
	const readOnly = household.data?.plus.active === false;

	return (
		<PlusCard initialFocus={titleRef} finalFocus={finalFocus}>
			<PlusCardHeading
				pill="Plan Gratis"
				title="Tu prueba de Plus terminó"
				description="Volviste al plan Gratis. No se borró nada."
				titleRef={titleRef}
			/>
			<PlusRows rows={readOnly ? [KEPT, HOUSEHOLD_READ_ONLY] : [KEPT]} />
			<div className="mt-6 grid gap-2.5">
				<Button size="xl" className={BIG} onClick={() => onClose(true)}>
					Suscribirme
				</Button>
				<Button size="xl" variant="outline" className={BIG} onClick={() => onClose(false)}>
					Seguir con Gratis
				</Button>
			</div>
		</PlusCard>
	);
}
