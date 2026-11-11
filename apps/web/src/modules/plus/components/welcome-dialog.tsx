import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CircleDollarSign, Target, Wallet } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Dialog } from "#/components/ui/dialog";
import { useOpenPlus } from "../plus-provider";
import { PLUS_CARD_BUTTON as BIG, PlusCard } from "./plus-card";

const ROWS = [
	{ Icon: Wallet, name: "Tu dinero en sobres.", detail: "Necesidades, Gustos y Ahorro." },
	{ Icon: Target, name: "2 metas y 2 bancos.", detail: "El fondo no cuenta como meta." },
	{
		Icon: CircleDollarSign,
		name: "Tu número del día en Inicio.",
		detail: "Mira cuánto puedes gastar hoy.",
	},
];

/** B1: once, on the first Inicio after Primeros pasos, for someone on Gratis. Closing it never starts anything. */
export function WelcomeDialog() {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const openPlus = useOpenPlus();
	const markSeen = useMutation({ mutationFn: useConvexMutation(api.profiles.markWelcomeSeen) });
	const [closedAs, setClosedAs] = useState<"done" | "plus" | null>(null);
	const unseen = profile.data?.plan != null && !profile.data.welcomeSeen && !profile.data.hasPlus;

	const close = (as: "done" | "plus") => {
		setClosedAs(as);
		markSeen.mutate({});
	};

	return (
		<Dialog
			open={unseen && closedAs === null}
			onOpenChange={(open) => {
				if (!open) close("done");
			}}
		>
			<PlusCard
				pill="Plan Gratis"
				title="Tu plan es Gratis"
				description="Lo esencial para ordenar tu dinero."
				rows={ROWS}
				note={
					<>
						<strong className="font-medium text-foreground">
							Plus suma Nuestro espacio, más metas y más bancos en Android.
						</strong>{" "}
						Pruébalo gratis 14 días cuando lo necesites.
					</>
				}
				// Off to PW1, focus stays with PW1.
				finalFocus={() => closedAs !== "plus"}
			>
				<Button size="xl" className={BIG} onClick={() => close("done")}>
					Empezar
				</Button>
				<Button
					size="xl"
					variant="outline"
					className={BIG}
					onClick={() => {
						close("plus");
						openPlus({});
					}}
				>
					Ver Plus
				</Button>
			</PlusCard>
		</Dialog>
	);
}
