import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { cn } from "cn";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { canEdit, editDraft, type Movement } from "#/modules/register/movement-draft";
import { useRegister } from "#/modules/register/register-dialog";

const KIND = {
	expense: { name: "Gasto", adds: false },
	income: { name: "Ingreso", adds: true },
	contribution: { name: "Aporte", adds: false },
	saving: { name: "Ahorro", adds: false },
	withdrawal: { name: "Retiro del fondo", adds: true },
} satisfies Record<Movement["kind"], { name: string; adds: boolean }>;

export function MovementRow({ row }: { row: Movement }) {
	const openRegister = useRegister();
	const { name, adds } = KIND[row.kind];
	const isSaving = row.kind === "saving";
	const envelope = isSaving
		? "Ahorro · no es gasto"
		: row.envelope
			? ENVELOPE_LABELS[row.envelope]
			: "Ingreso · Para este ciclo";
	// Personal leaves who null; household sends the author name and we swap mine → Tú here.
	const whoLabel = row.mine && row.who !== null ? "Tú" : row.who;
	const detail = [envelope, whoLabel].filter(Boolean).join(" · ");
	const amount = formatCents(row.amountCents);
	const signedAmount = isSaving ? amount : `${adds ? "+" : "−"}${amount}`;
	const text = (
		<>
			<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
				<span
					aria-hidden
					className={cn(
						"size-2.5 rounded-full",
						row.envelope ? ENVELOPE_DOT[row.envelope] : "bg-success",
					)}
				/>
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-sm font-semibold">{row.note || name}</span>
				<span className="block truncate text-xs text-muted-foreground">{detail}</span>
			</span>
			<span className={cn("shrink-0 text-sm font-semibold tabular-nums", adds && "text-success")}>
				{signedAmount}
			</span>
		</>
	);

	return (
		<li className="border-b border-border/60 last:border-0">
			{canEdit(row) ? (
				<button
					type="button"
					onClick={() => openRegister(editDraft(row))}
					className="flex w-full items-center gap-3 py-3.5 text-left"
				>
					{text}
				</button>
			) : (
				<div className="flex items-center gap-3 py-3.5">{text}</div>
			)}
		</li>
	);
}
