import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { readError } from "#/lib/read-error";
import { needsPlus } from "#/modules/plus/needs-plus";
import { useOpenPlus } from "#/modules/plus/plus-provider";
import { shareInvite } from "../invite-link";

/** W-U0: Nuestro espacio before it exists. The page switches to W-U1 on its own once the household does. */
export function EmptyHousehold({ firstName, hasPlus }: { firstName: string; hasPlus: boolean }) {
	const openPlus = useOpenPlus();
	const createHousehold = useConvexMutation(api.household.createHousehold);
	const invite = useMutation({
		mutationFn: async () => {
			const { code } = await createHousehold({});
			await shareInvite(code, firstName);
		},
		onError: (error) => {
			if (needsPlus(error)) openPlus({ feature: "household" });
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
					onClick={(event) =>
						hasPlus
							? invite.mutate()
							: openPlus({ feature: "household", opener: event.currentTarget })
					}
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
		</section>
	);
}
