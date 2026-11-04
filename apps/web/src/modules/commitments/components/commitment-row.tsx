import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, type Envelope, formatCents, toCents } from "@quipu/backend/shared/budget";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { readError } from "#/lib/read-error";
import {
	canPay,
	type CommitmentItem,
	describeDue,
	describePaid,
	type Payment,
} from "../commitment-view";
import { AmountField } from "./amount-field";

const BADGE = {
	overdue: { text: "Vencido", className: "bg-primary/15 text-primary" },
	upcoming: { text: "Próximo", className: "bg-warning/15 text-warning-foreground" },
} as const;

const AMOUNT_ERROR = "Escribe un monto.";

function PayInline({
	item,
	space,
	onClose,
}: {
	item: CommitmentItem;
	space: "personal" | "household";
	onClose: () => void;
}) {
	const markPaid = useConvexMutation(api.commitments.markPaid);
	const [amount, setAmount] = useState((item.amountCents / 100).toFixed(2));
	const [tried, setTried] = useState(false);
	const amountCents = toCents(amount);
	const pay = useMutation({
		mutationFn: () => markPaid({ space, id: item.id, amountCents }),
		onSuccess: onClose,
	});

	function confirm() {
		setTried(true);
		if (amountCents > 0) pay.mutate();
	}

	return (
		<div className="mb-3 rounded-xl bg-muted/60 p-4">
			<p className="text-sm text-muted-foreground">Pagar {item.name}</p>
			<div className="mt-2 flex flex-wrap items-start gap-3">
				<div className="min-w-40 flex-1">
					<AmountField
						label={`Monto a pagar de ${item.name}`}
						value={amount}
						onChange={setAmount}
						error={tried && amountCents === 0 ? AMOUNT_ERROR : undefined}
					/>
				</div>
				<span className="rounded-full bg-foreground px-3 py-1.5 text-sm font-semibold text-background">
					{ENVELOPE_LABELS[item.envelope]}
				</span>
				<Button loading={pay.isPending} onClick={confirm}>
					Confirmar pago
				</Button>
			</div>
			{pay.isError ? (
				<p role="alert" className="mt-2 text-xs text-warning-foreground">
					{readError(pay.error)}
				</p>
			) : null}
		</div>
	);
}

function RowLayout({
	envelope,
	paid,
	name,
	badge,
	detail,
	amountCents,
	action,
	below,
}: {
	envelope: Envelope;
	paid: boolean;
	name: string;
	badge?: (typeof BADGE)[keyof typeof BADGE] | null;
	detail: string;
	amountCents: number;
	action?: React.ReactNode;
	below?: React.ReactNode;
}) {
	return (
		<li className="border-b border-border/60 last:border-0">
			<div className="flex items-center gap-3 py-3.5">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
					<span
						aria-hidden
						className={cn(
							"size-2.5 rounded-full",
							paid ? "bg-muted-foreground" : ENVELOPE_DOT[envelope],
						)}
					/>
				</span>
				<span className="min-w-0 flex-1">
					<span className="flex items-center gap-2">
						<span className="truncate text-sm font-semibold">{name}</span>
						{badge ? (
							<span
								className={cn(
									"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
									badge.className,
								)}
							>
								{badge.text}
							</span>
						) : null}
					</span>
					<span className="block truncate text-xs text-muted-foreground">{detail}</span>
				</span>
				<span
					className={cn(
						"shrink-0 text-sm font-semibold tabular-nums",
						paid && "text-muted-foreground",
					)}
				>
					S/ {formatCents(amountCents)}
				</span>
				{action}
			</div>
			{below}
		</li>
	);
}

export function PaymentRow({ payment, today }: { payment: Payment; today: string }) {
	return (
		<RowLayout
			paid
			envelope={payment.envelope}
			name={payment.name}
			detail={describePaid(payment, today)}
			amountCents={payment.amountCents}
		/>
	);
}

export function CommitmentRow({
	item,
	today,
	space,
}: {
	item: CommitmentItem;
	today: string;
	space: "personal" | "household";
}) {
	const [paying, setPaying] = useState(false);
	const badge = item.status === "overdue" || item.status === "upcoming" ? BADGE[item.status] : null;

	return (
		<RowLayout
			paid={item.status === "paid"}
			envelope={item.envelope}
			name={item.name}
			badge={badge}
			detail={describeDue(item, today)}
			amountCents={item.amountCents}
			action={
				canPay(item) ? (
					<Button
						variant={item.status === "upcoming" ? "default" : "outline"}
						size="sm"
						className="min-h-11"
						aria-expanded={paying}
						onClick={() => setPaying((open) => !open)}
					>
						Marcar pagado
					</Button>
				) : null
			}
			below={
				paying ? <PayInline item={item} space={space} onClose={() => setPaying(false)} /> : null
			}
		/>
	);
}
