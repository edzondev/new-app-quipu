import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatFullDay, getLimaDate } from "@quipu/backend/shared/dates";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { QuipuHeader } from "#/components/quipu-header";
import { Button } from "#/components/ui/button";
import { toastManager } from "#/components/ui/toast";
import { useSignOut } from "#/hooks/use-sign-out";
import { getAuthErrorMessage } from "#/lib/auth-errors";
import { readError } from "#/lib/read-error";

export function DeletionPendingPage() {
	const profile = useQuery(convexQuery(api.profiles.myProfile, {}));
	const navigate = useNavigate();
	const signOut = useSignOut("current");
	const cancelDeletion = useConvexMutation(api.accountDeletion.cancel);
	const cancel = useMutation({
		mutationFn: () => cancelDeletion({}),
		onSuccess: () => {
			toastManager.add({ title: "Eliminación cancelada.", type: "success" });
			return navigate({ to: "/home" });
		},
	});

	const runsAt = profile.data?.deletionRunsAt;
	if (!runsAt) return null;

	return (
		<div className="min-h-svh bg-background text-foreground">
			<QuipuHeader />
			<main className="mx-auto w-full max-w-170 px-7 pb-16 pt-6 sm:pt-12">
				<h1 className="font-heading text-[34px] leading-[1.1] font-normal tracking-[-0.01em]">
					Tu cuenta se eliminará el {formatFullDay(getLimaDate(new Date(runsAt)))}
				</h1>
				<p className="mt-3 text-sm leading-normal text-muted-foreground">
					Si no haces nada, ese día borraremos todo.
				</p>
				<div className="mt-8 flex flex-wrap gap-3">
					<Button
						size="xl"
						className="rounded-full"
						disabled={cancel.isPending}
						onClick={() => cancel.mutate()}
					>
						{cancel.isPending ? "Cancelando…" : "Cancelar eliminación"}
					</Button>
					<Button
						variant="outline"
						size="xl"
						className="rounded-full"
						loading={signOut.isPending}
						onClick={() => signOut.mutate()}
					>
						Cerrar sesión
					</Button>
				</div>
				{cancel.isError ? (
					<p role="alert" className="wrap-break-word mt-3 text-xs text-warning-foreground">
						{readError(cancel.error, "No pudimos cancelar. Intenta de nuevo.")}
					</p>
				) : null}
				{signOut.isError ? (
					<p role="alert" className="mt-3 text-xs text-warning-foreground">
						{getAuthErrorMessage(signOut.error)}
					</p>
				) : null}
			</main>
		</div>
	);
}
