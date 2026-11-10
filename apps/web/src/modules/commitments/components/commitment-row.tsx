import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, type Envelope, formatCents, toCents } from "@quipu/backend/shared/budget";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { useState } from "react";
import * as z from "zod/mini";
import { Button } from "#/components/ui/button";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { positiveMoney } from "#/lib/money-schema";
import { readError } from "#/lib/read-error";
import { ACTION } from "#/lib/typography";
import { useReadOnlyGate } from "#/modules/household/use-read-only-gate";
import {
	type CommitmentItem,
	canPay,
	describeDue,
	describePaid,
	type Payment,
	isAdjusted,
} from "../commitment-view";
import { AmountField } from "./amount-field";
import { BackToRuleButton, CommitmentMenu } from "./commitment-menu";

const BADGE = {
	overdue: { text: "Vencido", className: "bg-primary/15 text-primary" },
	upcoming: {
		text: "Próximo",
		className: "bg-warning/15 text-warning-foreground",
	},
} as const;

const paySchema = z.object({ amount: positiveMoney("Escribe un monto.") });

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
	const pay = useMutation({
		mutationFn: (amountCents: number) => markPaid({ space, id: item.id, amountCents }),
		onSuccess: onClose,
	});
	const form = useForm({
		defaultValues: { amount: (item.amountCents / 100).toFixed(2) },
		validationLogic: revalidateLogic(),
		validators: { onDynamic: paySchema },
		onSubmit: ({ value }) => pay.mutate(toCents(value.amount)),
	});

	return (
		<form
			noValidate
			className="pop-in mb-3 rounded-xl bg-muted/60 p-4"
			onSubmit={(event) => {
				event.preventDefault();
				void form.handleSubmit();
			}}
		>
			<p className="wrap-break-word text-sm text-muted-foreground">Pagar {item.name}</p>
			<div className="mt-2 flex flex-wrap items-start gap-3">
				<div className="min-w-40 flex-1">
					<form.Field name="amount">
						{(field) => (
							<AmountField
								label={`Monto a pagar de ${item.name}`}
								value={field.state.value}
								onChange={field.handleChange}
								error={field.state.meta.errors[0]?.message}
							/>
						)}
					</form.Field>
				</div>
				<span className="rounded-full bg-foreground px-3 py-1.5 text-sm font-semibold text-background">
					{ENVELOPE_LABELS[item.envelope]}
				</span>
				<Button type="submit" loading={pay.isPending}>
					Confirmar pago
				</Button>
			</div>
			{pay.isError ? (
				<p role="alert" className="wrap-break-word mt-2 text-xs text-warning-foreground">
					{readError(pay.error)}
				</p>
			) : null}
		</form>
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
	menu,
	below,
}: {
	envelope: Envelope;
	paid: boolean;
	name: string;
	badge?: (typeof BADGE)[keyof typeof BADGE] | null;
	detail: string;
	amountCents: number;
	action?: React.ReactNode;
	menu?: React.ReactNode;
	below?: React.ReactNode;
}) {
	const amount = (
		<span className="col-start-3 row-start-1 flex items-center gap-1 self-start sm:self-auto">
			<span
				className={cn(
					"font-mono text-[15px] leading-[1.3] sm:leading-normal",
					paid && "text-muted-foreground",
				)}
			>
				S/ {formatCents(amountCents)}
			</span>
			{menu}
		</span>
	);
	// Narrow screens show the status under the date; from `sm` it sits next to the name.
	const statusBadge = (className: string) =>
		badge ? (
			<span
				className={cn(
					"shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
					badge.className,
					className,
				)}
			>
				{badge.text}
			</span>
		) : null;

	// Narrow: name and amount on top, date and status below, the action on its own line.
	// From `sm` it is the single-line row, with the wrappers dissolved by `contents` or `flex`.
	return (
		<li className="border-b border-border/60">
			<div className="grid min-h-[60px] grid-cols-[auto_minmax(0,1fr)_auto] gap-x-3.5 gap-y-0.5 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-4">
				<div className="contents sm:flex sm:min-w-0 sm:items-center sm:gap-3.5">
					<span className="col-start-1 row-span-2 row-start-1 flex size-9 shrink-0 items-center justify-center rounded-full self-center bg-muted">
						<span
							aria-hidden
							className={cn(
								"size-2 rounded-full",
								paid ? "bg-muted-foreground" : ENVELOPE_DOT[envelope],
							)}
						/>
					</span>
					<span className="contents sm:block sm:min-w-0">
						<span className="col-start-2 row-start-1 flex min-w-0 items-center gap-2 self-start">
							<span className="min-w-0 text-[15px] leading-[1.3] font-semibold break-words sm:truncate">
								{name}
							</span>
							{statusBadge("max-sm:hidden")}
						</span>
						<span className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted-foreground sm:mt-0.5 sm:block sm:truncate">
							{detail}
							{statusBadge("sm:hidden")}
						</span>
					</span>
				</div>
				<div className="contents sm:flex sm:shrink-0 sm:items-center sm:gap-[18px]">
					{action ? <div className="col-span-3 row-start-3 mt-2 sm:contents">{action}</div> : null}
					{amount}
				</div>
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
	menu,
}: {
	item: CommitmentItem;
	today: string;
	space: "personal" | "household";
	/** Only Compromisos has the "⋯" menu; Inicio lists the same rows without it. */
	menu?: { onEdit: () => void };
}) {
	const [paying, setPaying] = useState(false);
	const gate = useReadOnlyGate();
	const badge = item.status === "overdue" || item.status === "upcoming" ? BADGE[item.status] : null;

	return (
		<RowLayout
			paid={item.status === "paid"}
			envelope={item.envelope}
			name={item.name}
			badge={badge}
			detail={describeDue(item, today)}
			amountCents={item.amountCents}
			menu={
				menu ? (
					<CommitmentMenu item={item} space={space} today={today} onEdit={menu.onEdit} />
				) : null
			}
			action={
				canPay(item) ? (
					<Button
						className={cn(ACTION, "h-11 w-full sm:h-[34px] sm:w-auto")}
						aria-expanded={paying}
						onClick={() => setPaying((open) => !open)}
						{...gate}
					>
						Ya pagué
					</Button>
				) : null
			}
			below={
				<>
					{isAdjusted(item) ? (
						<BackToRuleButton
							item={item}
							space={space}
							className={cn(ACTION, "mb-1 ml-[50px] min-h-11")}
						/>
					) : null}
					{paying ? <PayInline item={item} space={space} onClose={() => setPaying(false)} /> : null}
				</>
			}
		/>
	);
}
