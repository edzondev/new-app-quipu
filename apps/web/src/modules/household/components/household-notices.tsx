import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { formatCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { NoticeBar } from "#/modules/home/components/notice-bar";
import { PlusSheet } from "./plus-sheet";

type Household = NonNullable<FunctionReturnType<typeof api.household.get>>;

/** W-Plus4 / W-P17: the Plus lapsed, so the household can be read but not written. */
function ReadOnlyStrip({ payerName, payerIsMe }: { payerName: string | null; payerIsMe: boolean }) {
	const [sheetOpen, setSheetOpen] = useState(false);
	return (
		<div
			role="status"
			className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-warning/16 px-4 py-3 text-sm text-warning-foreground"
		>
			<p className="min-w-0 wrap-break-word">
				{payerName === null
					? "Pueden ver todo, pero no anotar."
					: `El Plus de ${payerName} venció. Pueden ver todo, pero no anotar.`}
			</p>
			<Button
				variant="outline"
				className="rounded-full pointer-coarse:min-h-11"
				onClick={() => setSheetOpen(true)}
			>
				{payerIsMe ? "Renovar" : "Pagar yo"}
			</Button>
			<PlusSheet open={sheetOpen} onOpenChange={setSheetOpen} />
		</div>
	);
}

/** What the other did that this person has not closed: they left, or took money from the fund. */
export function HouseholdNotices({ household }: { household: Household }) {
	const dismissLeft = useMutation({
		mutationFn: useConvexMutation(api.household.dismissPartnerLeft),
	});
	const dismissWithdrawal = useMutation({
		mutationFn: useConvexMutation(api.household.dismissWithdrawalNotice),
	});
	const { partnerLeft, withdrawalNotice } = household;

	return (
		<>
			{household.plus.active ? null : (
				<ReadOnlyStrip payerName={household.plus.payerName} payerIsMe={household.plus.payerIsMe} />
			)}
			{partnerLeft ? (
				<NoticeBar
					onDismiss={() => dismissLeft.mutate({})}
					pending={dismissLeft.isPending}
					error={dismissLeft.error}
				>
					<p className="wrap-break-word">{partnerLeft} salió de Nuestro espacio.</p>
				</NoticeBar>
			) : null}
			{withdrawalNotice ? (
				<NoticeBar
					onDismiss={() => dismissWithdrawal.mutate({})}
					pending={dismissWithdrawal.isPending}
					error={dismissWithdrawal.error}
				>
					<p className="wrap-break-word">
						{withdrawalNotice.name} retiró S/ {formatCents(withdrawalNotice.amountCents)} del fondo.
					</p>
				</NoticeBar>
			) : null}
		</>
	);
}
