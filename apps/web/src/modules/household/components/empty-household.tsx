import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { readError } from "#/lib/read-error";
import { shareInvite } from "../invite-link";
import { PlusSheet } from "./plus-sheet";

const NEEDS_PLUS = "Esto requiere Quipu Plus.";
const needsPlus = (error: unknown) => error instanceof ConvexError && error.data === NEEDS_PLUS;

/** W-U0: Nuestro espacio before it exists. The page switches to W-U1 on its own once the household does. */
export function EmptyHousehold({ firstName, hasPlus }: { firstName: string; hasPlus: boolean }) {
	const [sheetOpen, setSheetOpen] = useState(false);
	const createHousehold = useConvexMutation(api.household.createHousehold);
	const invite = useMutation({
		mutationFn: async () => {
			const { code } = await createHousehold({});
			await shareInvite(code, firstName);
		},
		// The trial can end while `hasPlus` is still old: the server decides, and the answer is the sheet.
		onError: (error) => {
			if (needsPlus(error)) setSheetOpen(true);
		},
	});

	return (
		<section className="mt-10 pb-16 sm:mt-14">
			<h1 className="max-w-2xl font-heading text-3xl font-medium tracking-tight sm:text-5xl">
				Lleven juntos los gastos de la casa.
			</h1>
			<p className="mt-5 max-w-lg text-sm text-muted-foreground">
				Un número del día para los dos. Tus sobres personales siguen siendo solo tuyos.
			</p>
			<div className="mt-8 flex flex-col items-start gap-3">
				<Button
					size="lg"
					className="rounded-full px-7"
					loading={invite.isPending}
					onClick={() => (hasPlus ? invite.mutate() : setSheetOpen(true))}
				>
					Invitar a tu pareja
				</Button>
				<p className="text-xs text-muted-foreground">Solo 2 personas por espacio.</p>
				{invite.isError && !needsPlus(invite.error) ? (
					<p role="alert" className="text-xs text-warning-foreground">
						{readError(invite.error)}
					</p>
				) : null}
			</div>
			<PlusSheet open={sheetOpen} onOpenChange={setSheetOpen} />
		</section>
	);
}
