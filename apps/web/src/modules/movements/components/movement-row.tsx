import { convexQuery } from "@convex-dev/react-query";
import { api } from "@quipu/backend/convex/_generated/api";
import { ENVELOPE_LABELS, formatCents } from "@quipu/backend/shared/budget";
import { formatDay, monthName } from "@quipu/backend/shared/dates";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { cn } from "cn";
import { ENVELOPE_DOT } from "#/lib/envelope-dot";
import { canEdit, editDraft, type Movement } from "#/modules/register/movement-draft";
import { useHouseholdGate, useReadOnlyGate } from "#/modules/household/use-read-only-gate";
import { useRegister } from "#/modules/register/register-dialog";

const KIND = {
	expense: { name: "Gasto", adds: false },
	income: { name: "Ingreso", adds: true },
	withdrawal: { name: "Retiro del fondo", adds: true },
} satisfies Record<"expense" | "income" | "withdrawal", { name: string; adds: boolean }>;

function incomeLabel(row: Movement, when?: string) {
	if (row.extra) return "Ingreso · Extra";
	if (row.startsOn) return `Ingreso · Para ${monthName(row.startsOn)} · ${formatDay(row.date)}`;
	return when ? "Ingreso" : "Ingreso · Para este ciclo";
}

function rowText(row: Movement, inHousehold: boolean, when?: string) {
	const label = (envelope: Movement["envelope"]) => (envelope ? ENVELOPE_LABELS[envelope] : "");
	if (row.kind === "contribution") {
		const to = label(row.toEnvelope);
		if (!inHousehold) {
			return {
				name: "Aporte a Nuestro espacio",
				envelope: `Personal · ${label(row.envelope)} → Nuestro espacio · ${to}`,
				sign: null,
			};
		}
		const name = row.mine ? "Tu aporte" : `Aporte de ${row.who}`;
		return { name, envelope: `${to} · no es gasto`, sign: "+" };
	}
	if (row.kind === "saving")
		return { name: "Ahorro", envelope: "Ahorro · no es gasto", sign: null };
	const { name, adds } = KIND[row.kind];
	const envelope = row.envelope ? label(row.envelope) : incomeLabel(row, when);
	return { name, envelope, sign: adds ? "+" : "−" };
}

export function MovementRow({ row, when }: { row: Movement; when?: string }) {
	const openRegister = useRegister();
	const readOnlyGate = useReadOnlyGate();
	const { space } = useSearch({ from: "/_app" });
	const inHousehold = space === "household";
	// An aporte is changed in the household too: it needs one the person can still write in.
	const aporte = row.kind === "contribution";
	const household = useQuery(convexQuery(api.household.get, aporte ? {} : "skip"));
	const householdGate = useHouseholdGate(aporte);
	const gate = aporte ? householdGate : readOnlyGate;
	const editable = canEdit(row, inHousehold) && (!aporte || Boolean(household.data));
	const { name, envelope, sign } = rowText(row, inHousehold, when);
	const adds = sign === "+";
	// Personal leaves who null; household sends the author's first name. Only the author changes a row.
	const whoLabel = row.who === null ? null : row.mine ? "Tú" : `Anotó ${row.who}`;
	const detail = [envelope, whoLabel, when].filter(Boolean).join(" · ");
	const amount = formatCents(row.amountCents);
	const signedAmount = sign ? `${sign} S/ ${amount}` : `S/ ${amount}`;
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
			{editable ? (
				<button
					type="button"
					onClick={() => openRegister(editDraft(row))}
					{...gate}
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
