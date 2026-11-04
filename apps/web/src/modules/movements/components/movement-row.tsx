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

export function MovementRow({ row, when }: { row: Movement; when?: string }) {
	const openRegister = useRegister();
	const { name, adds } = KIND[row.kind];
	const isSaving = row.kind === "saving";
	const envelope = isSaving
		? "Ahorro · no es gasto"
		: row.envelope
			? ENVELOPE_LABELS[row.envelope]
			: when
				? "Ingreso"
				: "Ingreso · Para este ciclo";
	// Personal leaves who null; household sends the author name and we swap mine → Tú here.
	const whoLabel = row.mine && row.who !== null ? "Tú" : row.who;
	const detail = [envelope, whoLabel, when].filter(Boolean).join(" · ");
	const amount = formatCents(row.amountCents);
	const signedAmount = isSaving ? `S/ ${amount}` : `${adds ? "+" : "−"} S/ ${amount}`;
	const text = (
		<>
			<span className="flex min-w-0 items-center gap-3.5">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
					<span
						aria-hidden
						className={cn(
							"size-2 rounded-full",
							row.envelope ? ENVELOPE_DOT[row.envelope] : "bg-success",
						)}
					/>
				</span>
				<span className="min-w-0">
					<span className="block truncate text-[15px] leading-[1.3] font-semibold">
						{row.note || name}
					</span>
					<span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
						{detail}
					</span>
				</span>
			</span>
			<span className={cn("shrink-0 font-mono text-[15px]", adds && "text-success")}>
				{signedAmount}
			</span>
		</>
	);

	return (
		<li className="border-b border-border/60">
			{canEdit(row) ? (
				<button
					type="button"
					onClick={() => openRegister(editDraft(row))}
					className="flex min-h-[60px] w-full items-center justify-between gap-4 py-2.5 text-left"
				>
					{text}
				</button>
			) : (
				<div className="flex min-h-[60px] items-center justify-between gap-4 py-2.5">{text}</div>
			)}
		</li>
	);
}
